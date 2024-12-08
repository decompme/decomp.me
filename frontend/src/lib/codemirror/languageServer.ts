/* Originally adapted from https://github.com/FurqanSoftware/codemirror-languageserver */

import type { ClangdStdioTransport } from "@clangd-wasm/clangd-wasm"
import { autocompletion } from "@codemirror/autocomplete"
import type {
    Completion,
    CompletionContext,
    CompletionResult,
} from "@codemirror/autocomplete"
import { setDiagnostics } from "@codemirror/lint"
import { type Extension, Facet } from "@codemirror/state"
import type { Text } from "@codemirror/state"
import { type EditorView, ViewPlugin, type Tooltip, hoverTooltip, keymap } from "@codemirror/view"
import type { ViewUpdate, PluginValue } from "@codemirror/view"
import {
    RequestManager,
    Client,
} from "@open-rpc/client-js"
import type { Transport } from "@open-rpc/client-js/build/transports/Transport"
import {
    DiagnosticSeverity,
    CompletionItemKind,
    CompletionTriggerKind,
} from "vscode-languageserver-protocol"
import type * as LSP from "vscode-languageserver-protocol"

const timeout = 10000
const changesDelay = 500

const CompletionItemKindMap = Object.fromEntries(
    Object.entries(CompletionItemKind).map(([key, value]) => [value, key])
) as Record<CompletionItemKind, string>

const useLast = <T>(values: readonly T[]) => values.reduce((_, v) => v, "" as T)

const client = Facet.define<LanguageServerClient, LanguageServerClient>({ combine: useLast })
const documentUri = Facet.define<string, string>({ combine: useLast })
const languageId = Facet.define<string, string>({ combine: useLast })

// https://microsoft.github.io/language-server-protocol/specifications/specification-current/

// Client to server then server to client
interface LSPRequestMap {
    initialize: [LSP.InitializeParams, LSP.InitializeResult]
    "textDocument/hover": [LSP.HoverParams, LSP.Hover]
    "textDocument/completion": [
        LSP.CompletionParams,
        LSP.CompletionItem[] | LSP.CompletionList | null,
    ]
    "textDocument/formatting": [LSP.DocumentFormattingParams, LSP.TextEdit[] | null]
    "shutdown": [null, null]
}

// Client to server
interface LSPNotifyMap {
    initialized: LSP.InitializedParams
    "textDocument/didChange": LSP.DidChangeTextDocumentParams
    "textDocument/didOpen": LSP.DidOpenTextDocumentParams
    "textDocument/didSave": LSP.DidSaveTextDocumentParams
    "exit": null
}

// Server to client
interface LSPEventMap {
    "textDocument/publishDiagnostics": LSP.PublishDiagnosticsParams
}

type Notification = {
    [key in keyof LSPEventMap]: {
        jsonrpc: "2.0"
        id?: null | undefined
        method: key
        params: LSPEventMap[key]
    };
}[keyof LSPEventMap];

class LanguageServerClient {
    private rootUri: string
    private workspaceFolders: LSP.WorkspaceFolder[]
    private autoClose?: boolean

    private transport: Transport
    private requestManager: RequestManager
    private client: Client

    public ready: boolean
    public capabilities: LSP.ServerCapabilities

    private plugins: LanguageServerPlugin[]

    public initializePromise: Promise<void>

    constructor(options: LanguageServerClientOptions) {
        this.rootUri = options.rootUri
        this.workspaceFolders = options.workspaceFolders
        this.autoClose = options.autoClose
        this.plugins = []
        this.transport = options.transport

        this.requestManager = new RequestManager([this.transport])
        this.client = new Client(this.requestManager)

        this.client.onNotification(data => {
            this.processNotification(data as Notification)
        })

        this.initializePromise = this.initialize()
    }

    async initialize() {
        const { capabilities } = await this.request("initialize", {
            capabilities: {
                textDocument: {
                    hover: {
                        dynamicRegistration: true,
                        contentFormat: ["plaintext", "markdown"],
                    },
                    moniker: {},
                    synchronization: {
                        dynamicRegistration: true,
                        willSave: false,
                        didSave: true,
                        willSaveWaitUntil: false,
                    },
                    completion: {
                        dynamicRegistration: true,
                        completionItem: {
                            snippetSupport: false,
                            commitCharactersSupport: true,
                            documentationFormat: ["plaintext", "markdown"],
                            deprecatedSupport: false,
                            preselectSupport: false,
                        },
                        contextSupport: false,
                    },
                    signatureHelp: {
                        dynamicRegistration: true,
                        signatureInformation: {
                            documentationFormat: ["plaintext", "markdown"],
                        },
                    },
                    declaration: {
                        dynamicRegistration: true,
                        linkSupport: true,
                    },
                    definition: {
                        dynamicRegistration: true,
                        linkSupport: true,
                    },
                    typeDefinition: {
                        dynamicRegistration: true,
                        linkSupport: true,
                    },
                    implementation: {
                        dynamicRegistration: true,
                        linkSupport: true,
                    },
                    formatting: {
                        dynamicRegistration: true,
                    },
                },
                workspace: {
                    didChangeConfiguration: {
                        dynamicRegistration: true,
                    },
                },
            },
            initializationOptions: null,
            processId: null,
            rootUri: this.rootUri,
            workspaceFolders: this.workspaceFolders,
        }, timeout * 3)
        this.capabilities = capabilities
        this.notify("initialized", {})
        this.ready = true
    }

    async exit() {
        await this.request("shutdown", null, timeout)
        return this.notify("exit", null)
    }

    close() {
        this.client.close()
    }

    textDocumentDidOpen(params: LSP.DidOpenTextDocumentParams) {
        return this.notify("textDocument/didOpen", params)
    }

    textDocumentDidChange(params: LSP.DidChangeTextDocumentParams) {
        return this.notify("textDocument/didChange", params)
    }

    async textDocumentHover(params: LSP.HoverParams) {
        return await this.request("textDocument/hover", params, timeout)
    }

    async textDocumentCompletion(params: LSP.CompletionParams) {
        return await this.request("textDocument/completion", params, timeout)
    }

    async textDocumentFormatting(params: LSP.DocumentFormattingParams) {
        return await this.request("textDocument/formatting", params, timeout)
    }

    async textDocumentDidSave(params: LSP.DidSaveTextDocumentParams) {
        return this.notify("textDocument/didSave", params)
    }

    transportWriteFile(filename: string, contents: string) {
        const transport = <ClangdStdioTransport> this.transport
        transport.module?.FS?.writeFile(filename, contents)
    }

    attachPlugin(plugin: LanguageServerPlugin) {
        this.plugins.push(plugin)
    }

    detachPlugin(plugin: LanguageServerPlugin) {
        const i = this.plugins.indexOf(plugin)
        if (i === -1) return
        this.plugins.splice(i, 1)
        if (this.autoClose) this.close()
    }

    private request<K extends keyof LSPRequestMap>(
        method: K,
        params: LSPRequestMap[K][0],
        timeout: number
    ): Promise<LSPRequestMap[K][1]> {
        return this.client.request({ method, params }, timeout)
    }

    private notify<K extends keyof LSPNotifyMap>(
        method: K,
        params: LSPNotifyMap[K]
    ): Promise<LSPNotifyMap[K]> {
        return this.client.notify({ method, params })
    }

    private processNotification(notification: Notification) {
        for (const plugin of this.plugins)
            plugin.processNotification(notification)
    }
}

class LanguageServerPlugin implements PluginValue {
    public client: LanguageServerClient

    private documentUri: string
    private languageId: string
    private documentVersion: number

    private changesTimeout: number

    constructor(private view: EditorView) {
        this.client = this.view.state.facet(client)
        this.documentUri = this.view.state.facet(documentUri)
        this.languageId = this.view.state.facet(languageId)
        this.documentVersion = 0
        this.changesTimeout = 0

        this.client.attachPlugin(this)

        this.initialize({
            documentText: this.view.state.doc.toString(),
        })
    }

    update({ docChanged }: ViewUpdate) {
        if (!docChanged) return
        if (this.changesTimeout) clearTimeout(this.changesTimeout)
        this.changesTimeout = self.setTimeout(() => {
            this.sendChange({
                documentText: this.view.state.doc.toString(),
            })
        }, changesDelay)
    }

    async save(contents: string) {
        this.client.transportWriteFile(this.documentUri.split("file://")[1], contents)

        await this.client.textDocumentDidSave({
            textDocument: {
                uri: this.documentUri,
            },
            text: contents,
        })
    }

    destroy() {
        this.client.detachPlugin(this)
    }

    async initialize({ documentText }: { documentText: string }) {
        if (this.client.initializePromise) {
            await this.client.initializePromise
        }
        this.client.textDocumentDidOpen({
            textDocument: {
                uri: this.documentUri,
                languageId: this.languageId,
                text: documentText,
                version: this.documentVersion,
            },
        })
    }

    async sendChange({ documentText }: { documentText: string }) {
        if (!this.client.ready) return
        try {
            await this.client.textDocumentDidChange({
                textDocument: {
                    uri: this.documentUri,
                    version: this.documentVersion++,
                },
                contentChanges: [{ text: documentText }],
            })
        } catch (e) {
            console.error(e)
        }
    }

    requestDiagnostics(view: EditorView) {
        this.sendChange({ documentText: view.state.doc.toString() })
    }

    async requestHoverTooltip(
        view: EditorView,
        { line, character }: { line: number, character: number }
    ): Promise<Tooltip | null> {
        if (!this.client.ready || !this.client.capabilities.hoverProvider) return null

        this.sendChange({ documentText: view.state.doc.toString() })
        const result = await this.client.textDocumentHover({
            textDocument: { uri: this.documentUri },
            position: { line, character },
        })
        if (!result) return null
        const { contents, range } = result
        let pos = posToOffset(view.state.doc, { line, character })
        let end: number
        if (range) {
            pos = posToOffset(view.state.doc, range.start)
            end = posToOffset(view.state.doc, range.end)
        }
        if (pos === null) return null
        const dom = document.createElement("div")
        dom.classList.add("documentation")
        dom.innerHTML = formatContents(contents).join("<br/>")
        return { pos, end, create: _view => ({ dom }), above: true }
    }

    async requestCompletion(
        context: CompletionContext,
        { line, character }: { line: number, character: number },
        {
            triggerKind,
            triggerCharacter,
        }: {
            triggerKind: CompletionTriggerKind
            triggerCharacter: string | undefined
        }
    ): Promise<CompletionResult | null> {
        if (!this.client.ready || !this.client.capabilities.completionProvider) return null
        this.sendChange({
            documentText: context.state.doc.toString(),
        })

        const result = await this.client.textDocumentCompletion({
            textDocument: { uri: this.documentUri },
            position: { line, character },
            context: {
                triggerKind,
                triggerCharacter,
            },
        })

        if (!result) return null

        const items = "items" in result ? result.items : result

        let options = items.map(
            ({
                detail,
                label,
                kind,
                textEdit,
                documentation,
                sortText,
                filterText,
            }) => {
                const completion: Completion & {
                    filterText: string
                    sortText?: string
                    apply: string
                } = {
                    label,
                    detail,
                    apply: textEdit?.newText ?? label,
                    type: kind && CompletionItemKindMap[kind].toLowerCase(),
                    sortText: sortText ?? label,
                    filterText: filterText ?? label,
                }
                if (documentation) {
                    completion.info = formatContents(documentation).join("\n")
                }
                return completion
            }
        )

        const [, match] = prefixMatch(options)
        const token = context.matchBefore(match)
        let { pos } = context

        if (token) {
            pos = token.from
            const word = token.text.toLowerCase()
            if (/^\w+$/.test(word)) {
                options = options
                    .filter(({ filterText }) =>
                        filterText.toLowerCase().startsWith(word)
                    )
                    .sort(({ apply: a }, { apply: b }) => {
                        switch (true) {
                        case a.startsWith(token.text) &&
                                !b.startsWith(token.text):
                            return -1
                        case !a.startsWith(token.text) &&
                                b.startsWith(token.text):
                            return 1
                        }
                        return 0
                    })
            }
        }
        return {
            from: pos,
            options,
        }
    }

    async requestFormat() {
        return await this.client.textDocumentFormatting({
            textDocument: {
                uri: this.documentUri,
            },
            // We need this to be protocol-compilant, but clangd *entirely* ignores it.
            // For control over formatting options, see .clang-format
            options: {
                tabSize: 4,
                insertSpaces: true,
            },
        })
    }

    processNotification(notification: Notification) {
        try {
            switch (notification.method) {
            case "textDocument/publishDiagnostics":
                this.processDiagnostics(notification.params)
            }
        } catch (error) {
            console.error(error)
        }
    }

    processDiagnostics(params: LSP.PublishDiagnosticsParams) {
        if (params.uri !== this.documentUri) return

        const diagnostics = params.diagnostics
            .map(({ range, message, severity }) => ({
                from: posToOffset(this.view.state.doc, range.start),
                to: posToOffset(this.view.state.doc, range.end),
                severity: ({
                    [DiagnosticSeverity.Error]: "error",
                    [DiagnosticSeverity.Warning]: "warning",
                    [DiagnosticSeverity.Information]: "info",
                    [DiagnosticSeverity.Hint]: "info",
                } as const)[severity],
                message,
            }))
            .filter(({ from, to }) => from !== null && to !== null && from !== undefined && to !== undefined)
            .sort((a, b) => {
                switch (true) {
                case a.from < b.from:
                    return -1
                case a.from > b.from:
                    return 1
                }
                return 0
            })

        this.view.dispatch(setDiagnostics(this.view.state, diagnostics))
    }
}

interface LanguageServerBaseOptions {
    rootUri: string | null
    workspaceFolders: LSP.WorkspaceFolder[] | null
    documentUri: string
    languageId: string
}

interface LanguageServerClientOptions extends LanguageServerBaseOptions {
    transport: Transport
    autoClose?: boolean
}

interface LanguageServerOptions extends LanguageServerClientOptions {
    client?: LanguageServerClient
}

function languageServerWithTransport(options: LanguageServerOptions): [Extension[], (contents: string) => Promise<void>]{
    let plugin: LanguageServerPlugin | null = null

    const extension = [
        client.of(options.client || new LanguageServerClient({ ...options, autoClose: true })),
        documentUri.of(options.documentUri),
        languageId.of(options.languageId),
        ViewPlugin.define(view => {
            plugin = new LanguageServerPlugin(view);
            return plugin;
        }),
        hoverTooltip(
            (view, pos) =>
                plugin?.requestHoverTooltip(
                    view,
                    offsetToPos(view.state.doc, pos)
                ) ?? null
        ),
        autocompletion({
            override: [
                async context => {
                    if (plugin == null) return null

                    const { state, pos, explicit } = context
                    const line = state.doc.lineAt(pos)
                    let trigKind: CompletionTriggerKind =
                        CompletionTriggerKind.Invoked
                    let trigChar: string | undefined
                    if (
                        !explicit &&
                        plugin.client.capabilities?.completionProvider?.triggerCharacters?.includes(
                            line.text[pos - line.from - 1]
                        )
                    ) {
                        trigKind = CompletionTriggerKind.TriggerCharacter
                        trigChar = line.text[pos - line.from - 1]
                    }
                    if (
                        trigKind === CompletionTriggerKind.Invoked &&
                        !context.matchBefore(/\w+$/)
                    ) {
                        return null
                    }
                    return await plugin.requestCompletion(
                        context,
                        offsetToPos(state.doc, pos),
                        {
                            triggerKind: trigKind,
                            triggerCharacter: trigChar,
                        }
                    )
                },
            ],
        }),
        keymap.of([
            { key: "Alt-Shift-f", run: target => {
                (async () => {
                    const formattingEdits = await plugin.requestFormat()
                    if (!formattingEdits) return

                    const changes = formattingEdits.map(change => {
                        return {
                            from: posToOffset(target.state.doc, change.range.start),
                            to: posToOffset(target.state.doc, change.range.end),
                            insert: change.newText,
                        }
                    })

                    target.dispatch({ changes })
                })()

                return true
            } },
        ]),
    ]

    const saveDocument = async (contents: string) => {
        if (!plugin) return
        await plugin.save(contents)
    }

    return [extension, saveDocument]
}

function posToOffset(doc: Text, pos: { line: number, character: number }) {
    if (pos.line >= doc.lines) return
    const offset = doc.line(pos.line + 1).from + pos.character
    if (offset > doc.length) return
    return offset
}

function offsetToPos(doc: Text, offset: number) {
    const line = doc.lineAt(offset)
    return {
        line: line.number - 1,
        character: offset - line.from,
    }
}

function formatContents(
    contents: LSP.MarkupContent | LSP.MarkedString | LSP.MarkedString[]
): string[] {
    if (Array.isArray(contents)) {
        return contents.flatMap(formatContentEntry)
    } else {
        return formatContentEntry(contents)
    }
}

function formatContentEntry(entry: LSP.MarkupContent | LSP.MarkedString): string[] {
    if (typeof entry === "string") {
        return entry.split("\n")
    } else {
        return formatContentEntry(entry.value)
    }
}

function toSet(chars: Set<string>) {
    let preamble = ""
    let flat = Array.from(chars).join("")
    const words = /\w/.test(flat)
    if (words) {
        preamble += "\\w"
        flat = flat.replace(/\w/g, "")
    }
    return `[${preamble}${flat.replace(/[^\w\s]/g, "\\$&")}]`
}

function prefixMatch(options: Completion[]) {
    const first = new Set<string>()
    const rest = new Set<string>()

    for (const { apply } of options) {
        const applyString = apply as string
        const initial = applyString.at(0)
        const restStr = applyString.substring(1)

        first.add(initial)
        for (const char of restStr) {
            rest.add(char)
        }
    }

    const source = `${toSet(first) + toSet(rest)}*$`
    return [new RegExp(`^${source}`), new RegExp(source)]
}

export { LanguageServerClient, languageServerWithTransport }
