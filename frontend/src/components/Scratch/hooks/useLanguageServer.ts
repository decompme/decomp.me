import { Compartment, StateEffect } from "@codemirror/state";
import type { CompileCommands } from "@decompme/clangd-wasm";
import type { EditorView } from "codemirror";
import { type RefObject, useEffect, useRef, useState } from "react";

import type * as api from "@/lib/api";
import { ClangdWorkerTransport } from "@/lib/codemirror/clangdWorkerTransport";
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

    const [saveSource, setSaveSource] =
        useState<(source: string) => Promise<void>>(undefined);
    const [saveContext, setSaveContext] =
        useState<(context: string) => Promise<void>>(undefined);
    const languageServerCompartment = useRef(new Compartment());

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
        if (!enabled || !languageId) return;
        if (!initialScratchState) return;
        if (!defaultClangFormat) return;

        const { scratch: initialScratch, languageId: initialLanguageId } =
            initialScratchState;

        const sourceFilename = `source.${initialLanguageId}`;
        const contextFilename = `context.${initialLanguageId}`;

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

        const transport = new ClangdWorkerTransport(
            compileCommands,
            initialFileState,
        );

        const _lsClient = new LanguageServerClient({
            transport,

            rootUri: "file:///",
            workspaceFolders: null,
            documentUri: null,
            languageId: initialLanguageId,
        });

        const [sourceLsExtension, _saveSource] = languageServerWithTransport({
            client: _lsClient,
            transport: null,
            rootUri: "file:///",
            workspaceFolders: null,
            documentUri: `file:///${sourceFilename}`,
            languageId: initialLanguageId,
        });

        const [contextLsExtension, _saveContext] = languageServerWithTransport({
            client: _lsClient,
            transport: null,
            rootUri: "file:///",
            workspaceFolders: null,
            documentUri: `file:///${contextFilename}`,
            languageId: initialLanguageId,
        });

        // TODO: return the codemirror extensions instead of hotpatching them in?
        // Given the async nature of the extension being ready, it'd require updating the Codemirror
        // component to support inserting extensions when the extension prop changes
        sourceEditor.current?.dispatch({
            effects: StateEffect.appendConfig.of(
                languageServerCompartment.current.of(sourceLsExtension),
            ),
        });
        contextEditor.current?.dispatch({
            effects: StateEffect.appendConfig.of(
                languageServerCompartment.current.of(contextLsExtension),
            ),
        });

        setSaveSource(() => _saveSource);
        setSaveContext(() => _saveContext);

        return () => {
            const removeLanguageServer =
                languageServerCompartment.current.reconfigure([]);
            sourceEditor.current?.dispatch({
                effects: removeLanguageServer,
            });
            contextEditor.current?.dispatch({
                effects: removeLanguageServer,
            });
            setSaveSource(undefined);
            setSaveContext(undefined);
            void _lsClient.exit().finally(() => transport.close());
        };
    }, [
        enabled,
        languageId,
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
