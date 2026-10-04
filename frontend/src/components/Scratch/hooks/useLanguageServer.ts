import type {
    ClangdStdioTransport,
    CompileCommands,
} from "@clangd-wasm/clangd-wasm";
import { StateEffect } from "@codemirror/state";
import type { EditorView } from "codemirror";
import { type RefObject, useEffect, useState } from "react";

import type * as api from "@/lib/api";
import {
    LanguageServerClient,
    languageServerWithTransport,
} from "@/lib/codemirror/languageServer";

type InitialLanguageServerState = {
    scratch: api.Scratch;
    languageId: "c" | "cpp";
};

function getClangdLanguageId(
    language: api.Language | undefined,
): "c" | "cpp" | undefined {
    if (language?.id === "c") return "c";
    if (language?.id === "cxx" || language?.id === "old_cxx") {
        return "cpp";
    }
    return undefined;
}

export default function useLanguageServer(
    enabled: boolean,
    scratch: api.Scratch,
    language: api.Language | undefined,
    sourceEditor: RefObject<EditorView>,
    contextEditor: RefObject<EditorView>,
) {
    const languageId = getClangdLanguageId(language);
    const [initialScratchState, setInitialScratchState] =
        useState<InitialLanguageServerState>(undefined);
    const [defaultClangFormat, setDefaultClangFormat] =
        useState<string>(undefined);

    const [ClangdStdioTransportModule, setClangdStdioTransportModule] =
        useState<typeof ClangdStdioTransport>(undefined);

    const [saveSource, setSaveSource] =
        useState<(source: string) => Promise<void>>(undefined);
    const [saveContext, setSaveContext] =
        useState<(context: string) => Promise<void>>(undefined);

    useEffect(() => {
        let isCurrent = true;

        const loadClangdModule = async () => {
            if (!enabled) return;
            if (!languageId) return;

            const { ClangdStdioTransport } = await import(
                "@clangd-wasm/clangd-wasm"
            );
            if (isCurrent) {
                setClangdStdioTransportModule(() => ClangdStdioTransport);
            }
        };

        loadClangdModule();

        return () => {
            isCurrent = false;
        };
    }, [languageId, enabled]);

    useEffect(() => {
        if (!initialScratchState && languageId) {
            setInitialScratchState({ scratch, languageId });
        }
    }, [scratch, languageId, initialScratchState]);

    useEffect(() => {
        let isCurrent = true;

        fetch(new URL("./default-clang-format.yaml", import.meta.url))
            .then((res) => res.text())
            .then((defaultClangFormat) => {
                if (isCurrent) {
                    setDefaultClangFormat(defaultClangFormat);
                }
            });

        return () => {
            isCurrent = false;
        };
    }, []);

    // We break this out into a seperate effect from the module loading
    // because if we had _lsClient defined inside an async function, we wouldn't be
    // able to reference it inside of the destructor.
    useEffect(() => {
        if (!ClangdStdioTransportModule) return;
        if (!initialScratchState) return;
        if (!defaultClangFormat) return;

        const { scratch: initialScratch, languageId } = initialScratchState;

        const sourceFilename = `source.${languageId}`;
        const contextFilename = `context.${languageId}`;

        const compileCommands: CompileCommands = [
            {
                directory: "/",
                file: sourceFilename,
                arguments: [
                    "clang",
                    sourceFilename,
                    "-include",
                    contextFilename,
                ],
            },
        ];

        const initialFileState: Record<string, string> = {
            ".clang-format": defaultClangFormat,
        };

        initialFileState[sourceFilename] = initialScratch.source_code;
        initialFileState[contextFilename] = initialScratch.context;

        const _lsClient = new LanguageServerClient({
            transport: new ClangdStdioTransportModule({
                compileCommands,
                initialFileState,
                useSmallBinary: false,
            }),

            rootUri: "file:///",
            workspaceFolders: null,
            documentUri: null,
            languageId,
        });

        const [sourceLsExtension, _saveSource] = languageServerWithTransport({
            client: _lsClient,
            transport: null,
            rootUri: "file:///",
            workspaceFolders: null,
            documentUri: `file:///${sourceFilename}`,
            languageId,
        });

        const [contextLsExtension, _saveContext] = languageServerWithTransport({
            client: _lsClient,
            transport: null,
            rootUri: "file:///",
            workspaceFolders: null,
            documentUri: `file:///${contextFilename}`,
            languageId,
        });

        // TODO: return the codemirror extensions instead of hotpatching them in?
        // Given the async nature of the extension being ready, it'd require updating the Codemirror
        // component to support inserting extensions when the extension prop changes
        sourceEditor.current?.dispatch({
            effects: StateEffect.appendConfig.of(sourceLsExtension),
        });
        contextEditor.current?.dispatch({
            effects: StateEffect.appendConfig.of(contextLsExtension),
        });

        setSaveSource(() => _saveSource);
        setSaveContext(() => _saveContext);

        return () => {
            _lsClient.exit();
        };
    }, [
        ClangdStdioTransportModule,
        initialScratchState,
        defaultClangFormat,
        sourceEditor,
        contextEditor,
    ]);

    const saveSourceRet = () => {
        if (saveSource) saveSource(scratch.source_code);
    };

    const saveContextRet = () => {
        if (saveContext) saveContext(scratch.context);
    };

    return [saveSourceRet, saveContextRet];
}
