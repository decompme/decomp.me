import { MutableRefObject, useEffect, useState } from "react"

import type { ClangdStdioTransport, CompileCommands } from "@clangd-wasm/clangd-wasm"
import { StateEffect } from "@codemirror/state"
import { EditorView } from "codemirror"

import * as api from "@/lib/api"
import { LanguageServerClient, languageServerWithTransport } from "@/lib/codemirror/languageServer"

export default function useLanguageServer(enabled: boolean, useSmallBinary: boolean, scratch: api.Scratch, sourceEditor: MutableRefObject<EditorView>, contextEditor: MutableRefObject<EditorView>) {
    const [initialScratchState, setInitialScratchState] = useState<api.Scratch>(undefined)
    const [defaultClangFormat, setDefaultClangFormat] = useState<string>(undefined)

    const [ClangdStdioTransportModule, setClangdStdioTransportModule] = useState<typeof ClangdStdioTransport>(undefined)

    const [saveSource, setSaveSource] = useState<(string) => Promise<void>>(undefined)
    const [saveContext, setSaveContext] = useState<(string) => Promise<void>>(undefined)

    useEffect(() => {
        const loadClangdModule = async () => {
            if (!enabled) return
            if (!(scratch.language == "C" || scratch.language == "C++")) return

            const { ClangdStdioTransport } = await import("@clangd-wasm/clangd-wasm")
            setClangdStdioTransportModule(() => ClangdStdioTransport)
        }

        loadClangdModule()
    }, [scratch.language, enabled])

    useEffect(() => {
        if (!initialScratchState) {
            setInitialScratchState(scratch)
        }
    }, [scratch, initialScratchState])

    useEffect(() => {
        fetch(new URL("./default-clang-format.yaml", import.meta.url))
            .then(res => res.text())
            .then(setDefaultClangFormat)
    }, [])

    // We break this out into a seperate effect from the module loading
    // because if we had _lsClient defined inside an async function, we wouldn't be
    // able to reference it inside of the destructor.
    useEffect(() => {
        if (!ClangdStdioTransportModule) return
        if (!initialScratchState) return
        if (!defaultClangFormat) return

        const languageId = {
            "C": "c",
            "C++": "cpp",
        }[initialScratchState.language]

        const sourceFilename = `source.${languageId}`
        const contextFilename = `context.${languageId}`

        const compileCommands: CompileCommands = [
            {
                directory: "/",
                file: sourceFilename,
                arguments: ["clang", sourceFilename, "-include", contextFilename],
            },
        ]

        const initialFileState = {
            ".clang-format": defaultClangFormat,
        }

        initialFileState[sourceFilename] = initialScratchState.source_code
        initialFileState[contextFilename] = initialScratchState.context

        const _lsClient = new LanguageServerClient({
            transport: new ClangdStdioTransportModule({
                compileCommands,
                initialFileState,
                useSmallBinary,
            }),

            rootUri: "file:///",
            workspaceFolders: null,
            documentUri: null,
            languageId,
        })

        const [sourceLsExtension, _saveSource] = languageServerWithTransport({
            client: _lsClient,
            transport: null,
            rootUri: "file:///",
            workspaceFolders: null,
            documentUri: `file:///${sourceFilename}`,
            languageId,
        })

        const [contextLsExtension, _saveContext] = languageServerWithTransport({
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

        setSaveSource(() => _saveSource)
        setSaveContext(() => _saveContext)

        return () => {
            _lsClient.exit()
        }

    }, [ClangdStdioTransportModule, initialScratchState, defaultClangFormat, useSmallBinary, sourceEditor, contextEditor])

    const saveSourceRet = () => {
        if (saveSource)
            saveSource(scratch.source_code)
    }

    const saveContextRet = () => {
        if (saveContext)
            saveContext(scratch.context)
    }

    return [saveSourceRet, saveContextRet]
}
