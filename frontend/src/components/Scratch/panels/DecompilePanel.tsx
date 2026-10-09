import type { EditorView } from "@codemirror/view";
import { useEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";

import CodeMirror from "@/components/Editor/CodeMirror";
import LoadingSpinner from "@/components/loading.svg";
import * as api from "@/lib/api";
import { scratchUrl } from "@/lib/api/urls";
import { decompileSetup } from "@/lib/codemirror/basic-setup";
import { cpp } from "@/lib/codemirror/cpp";
import useCompareExtension from "@/lib/codemirror/useCompareExtension";
import { decompile, isClientEnabled } from "@/lib/m2c/client";

import styles from "./DecompilePanel.module.scss";

export type Props = {
    scratch: api.Scratch;
};

export default function DecompilePanel({ scratch }: Props) {
    const [decompiledCode, setDecompiledCode] = useState<string | null>(null);
    const viewRef = useRef<EditorView>(null);
    const compareExtension = useCompareExtension(viewRef, scratch.source_code);
    const [debouncedContext] = useDebounce(scratch.context, 1000, {
        leading: false,
        trailing: true,
    });
    const [valueVersion, setValueVersion] = useState(0);
    const url = scratchUrl(scratch);
    const { compiler, isLoading: compilerIsLoading } = api.useCompilerMetadata(
        scratch.platform,
        scratch.compiler,
    );
    const { targetAsm, error: targetAsmError } = api.useTargetAsm(scratch);

    useEffect(() => {
        const clientEnabled = isClientEnabled();
        if (clientEnabled && compilerIsLoading) return;
        if (clientEnabled && targetAsm === undefined && !targetAsmError) return;

        let isCurrent = true;

        const serverDecompile = async () => {
            const response: { decompilation: string } = await api.post(
                `${url}/decompile`,
                {
                    context: debouncedContext,
                    compiler: scratch.compiler,
                },
            );
            return response.decompilation;
        };

        const runDecompile = async () => {
            if (
                clientEnabled &&
                compiler?.decompile_target &&
                typeof targetAsm === "string"
            ) {
                try {
                    return await decompile({
                        asm: targetAsm,
                        context: debouncedContext,
                        defaultSourceCode: "",
                        platformId: scratch.platform,
                        target: compiler.decompile_target,
                    });
                } catch (error) {
                    console.warn(
                        "Client-side m2c failed; falling back to cromper",
                        error,
                    );
                }
            }
            return await serverDecompile();
        };

        runDecompile().then((decompilation) => {
            if (!isCurrent) return;

            setDecompiledCode(decompilation);
            setValueVersion((v) => v + 1);
        });

        return () => {
            isCurrent = false;
        };
    }, [
        compiler,
        compilerIsLoading,
        debouncedContext,
        scratch.compiler,
        scratch.platform,
        targetAsm,
        targetAsmError,
        url,
    ]);

    const isLoading =
        decompiledCode === null || scratch.context !== debouncedContext;

    return (
        <div className={styles.container} data-tour="scratch-decompile-panel">
            <section
                className={styles.main}
                data-tour="scratch-decompile-content"
            >
                <p>
                    Modify the context or compiler to see how the decompilation
                    of the assembly changes.
                </p>

                {typeof decompiledCode === "string" && (
                    <CodeMirror
                        className={styles.editor}
                        value={decompiledCode}
                        valueVersion={valueVersion}
                        viewRef={viewRef}
                        extensions={[decompileSetup, cpp(), compareExtension]}
                    />
                )}
                {isLoading && <LoadingSpinner className={styles.loading} />}
            </section>
        </div>
    );
}
