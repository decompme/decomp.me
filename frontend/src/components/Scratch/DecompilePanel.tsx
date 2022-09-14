import { useEffect, useRef, useState } from "react"

import { EditorView } from "@codemirror/basic-setup"
import { cpp } from "@codemirror/lang-cpp"

import * as api from "../../lib/api"
import { decompileSetup } from "../../lib/codemirror/basic-setup"
import useCompareExtension from "../../lib/codemirror/useCompareExtension"
import CodeMirror from "../Editor/CodeMirror"
import Loading from "../loading.svg"

import styles from "./DecompilePanel.module.scss"

export type Props = {
    scratch: api.Scratch
}

export default function DecompilePanel({ scratch }: Props) {
    const [decompiledCode, setDecompiledCode] = useState<string | null>(null)
    const viewRef = useRef<EditorView>()
    const compareExtension = useCompareExtension(viewRef, scratch.source_code)

    // TODO: debounce
    useEffect(() => {
        setDecompiledCode(null)
        api.post(scratch.url + "/decompile", {
            context: scratch.context,
            compiler: scratch.compiler,
        }).then(({ decompilation }: { decompilation: string }) => {
            setDecompiledCode(decompilation)
        })
    }, [scratch.compiler, scratch.context, scratch.url])

    return <div className={styles.container}>
        <section className={styles.main}>
            <p>
                Modify the context or compiler to see how the decompilation
                of the assembly changes.
            </p>

            {(typeof decompiledCode == "string") ? <>
                <CodeMirror
                    className={styles.editor}
                    value={decompiledCode}
                    onChange={c => setDecompiledCode(c)}
                    viewRef={viewRef}
                    extensions={[
                        decompileSetup,
                        cpp(),
                        compareExtension,
                    ]}
                />
            </> : <Loading className={styles.loading} />}
        </section>
    </div>
}
