import { MutableRefObject, useEffect, useState } from "react"

import type { ClangdStdioTransport, CompileCommands } from "@clangd-wasm/clangd-wasm"
import { StateEffect } from "@codemirror/state"
import { EditorView } from "codemirror"

import * as api from "@/lib/api"
import { LanguageServerClient, languageServerWithTransport } from "@/lib/codemirror/languageserver"

export default function useLanguageServer(scratch: api.Scratch, sourceEditor: MutableRefObject<EditorView>, contextEditor: MutableRefObject<EditorView>) {
    const [ClangdStdioTransportModule, setClangdStdioTransportModule] = useState<typeof ClangdStdioTransport>(undefined)
    const [languageId, setLanguageId] = useState<string>(undefined)

    useEffect(() => {
        const loadClangdModule = async () => {
            if (!(scratch.language == "C" || scratch.language == "C++")) return

            setLanguageId({
                "C": "c",
                "C++": "cpp",
            }[scratch.language])

            // TODO: make this conditional on user opt-in
            const { ClangdStdioTransport } = await import("@clangd-wasm/clangd-wasm")
            setClangdStdioTransportModule(() => ClangdStdioTransport)
        }

        loadClangdModule()
    }, [scratch.language])

    // We break this out into a seperate effect from the module loading
    // because if we had _lsClient defined inside an async function, we wouldn't be
    // able to reference it inside of the destructor.
    useEffect(() => {
        if (!ClangdStdioTransportModule) return

        const sourceFilename = `source.${languageId}`
        const contextFilename = `context.${languageId}`

        const compileCommands: CompileCommands = [
            {
                directory: "/",
                file: "source.cpp",
                arguments: ["clang", sourceFilename, "-include", contextFilename],
            },
        ]

        const _lsClient = new LanguageServerClient({
            transport: new ClangdStdioTransportModule({ debug: true, compileCommands }),
            rootUri: "file:///",
            workspaceFolders: null,
            documentUri: null,
            languageId,
        })

        const sourceLsExtension = languageServerWithTransport({
            client: _lsClient,
            transport: null,
            rootUri: "file:///",
            workspaceFolders: null,
            documentUri: `file:///${sourceFilename}`,
            languageId,
        })

        const contextLsExtension = languageServerWithTransport({
            client: _lsClient,
            transport: null,
            rootUri: "file:///",
            workspaceFolders: null,
            documentUri: `file:///${contextFilename}`,
            languageId,
        })

        // TODO: return the codemirror extensions instead of hotpatching them in?
        // Given the async nature of the extension being ready, it'd require updaing the Codemirror
        // component to support inserting extensions when the extension prop changes
        sourceEditor.current?.dispatch({ effects: StateEffect.appendConfig.of(sourceLsExtension) })
        contextEditor.current?.dispatch({ effects: StateEffect.appendConfig.of(contextLsExtension) })

        return () => {
            (async () => {
                await _lsClient.exit()
            })()
        }

    }, [ClangdStdioTransportModule, languageId, contextEditor, sourceEditor])
}
