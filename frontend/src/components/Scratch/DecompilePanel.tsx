import { useEffect, useRef, useState } from "react"

import { EditorView } from "@codemirror/basic-setup"
import { cpp } from "@codemirror/lang-cpp"
import { EditorState, Compartment } from "@codemirror/state"

import * as api from "../../lib/api"
import basicSetup from "../../lib/codemirror/basic-setup"
import diffGutter, { target } from "../../lib/codemirror/diff-gutter"
import CodeMirror from "../Editor/CodeMirror"
import Loading from "../loading.svg"

import styles from "./DecompilePanel.module.scss"

export type Props = {
    scratch: api.Scratch
}

export default function DecompilePanel({ scratch }: Props) {
    const [decompiledCode, setDecompiledCode] = useState<string | null>(null)

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

    // Update the diff target when scratch source code changes
    const viewRef = useRef<EditorView | null>()
    const [compartment] = useState(new Compartment())
    useEffect(() => {
        if (viewRef.current) {
            viewRef.current.dispatch({
                effects: compartment.reconfigure(target.of(scratch.source_code)),
            })
        }
    }, [compartment, scratch.source_code])

    return <div className={styles.container}>
        <section className={styles.main}>
            <p>
                Modify the context and compiler options to see how the decompilation
                of the original assembly changes.
            </p>

            {(typeof decompiledCode == "string") ? <>
                <CodeMirror
                    className={styles.editor}
                    value={decompiledCode}
                    onChange={c => setDecompiledCode(c)}
                    viewRef={viewRef}
                    extensions={[
                        basicSetup,
                        cpp(),
                        EditorState.readOnly.of(true),
                        diffGutter,
                        compartment.of(target.of(scratch.source_code)),
                    ]}
                />
            </> : <Loading className={styles.loading} />}
        </section>
    </div>
}
