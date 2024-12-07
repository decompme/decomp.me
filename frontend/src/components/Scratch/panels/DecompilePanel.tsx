import { useEffect, useRef, useState } from "react"

import type { EditorView } from "@codemirror/view"
import { useDebounce } from "use-debounce"

import CodeMirror from "@/components/Editor/CodeMirror"
import Loading from "@/components/loading.svg"
import * as api from "@/lib/api"
import { scratchUrl } from "@/lib/api/urls"
import { decompileSetup } from "@/lib/codemirror/basic-setup"
import { cpp } from "@/lib/codemirror/cpp"
import useCompareExtension from "@/lib/codemirror/useCompareExtension"

import styles from "./DecompilePanel.module.scss"

export type Props = {
    scratch: api.Scratch
}

export default function DecompilePanel({ scratch }: Props) {
    const [decompiledCode, setDecompiledCode] = useState<string | null>(null)
    const viewRef = useRef<EditorView>()
    const compareExtension = useCompareExtension(viewRef, scratch.source_code)
    const [debouncedContext] = useDebounce(scratch.context, 1000, { leading: false, trailing: true })
    const [valueVersion, setValueVersion] = useState(0)
    const url = scratchUrl(scratch)

    useEffect(() => {
        api.post(`${url}/decompile`, {
            context: debouncedContext,
            compiler: scratch.compiler,
        }).then(({ decompilation }: { decompilation: string }) => {
            setDecompiledCode(decompilation)
            setValueVersion(v => v + 1)
        })
    }, [scratch.compiler, debouncedContext, url])

    const isLoading = decompiledCode === null || scratch.context !== debouncedContext

    return <div className={styles.container}>
        <section className={styles.main}>
            <p>
                Modify the context or compiler to see how the decompilation
                of the assembly changes.
            </p>

            {typeof decompiledCode == "string" && <>
                <CodeMirror
                    className={styles.editor}
                    value={decompiledCode}
                    valueVersion={valueVersion}
                    viewRef={viewRef}
                    extensions={[
                        decompileSetup,
                        cpp(),
                        compareExtension,
                    ]}
                />
            </>}
            {isLoading && <Loading className={styles.loading} />}
        </section>
    </div>
}
