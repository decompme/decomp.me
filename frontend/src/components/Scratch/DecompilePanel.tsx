import { useEffect, useState } from "react"

import { cpp } from "@codemirror/lang-cpp"
import { EditorState } from "@codemirror/state"

import * as api from "../../lib/api"
import basicSetup from "../../lib/codemirror/basic-setup"
import CodeMirror from "../Editor/CodeMirror"
import Loading from "../loading.svg"

import styles from "./DecompilePanel.module.scss"

export type Props = {
    scratch: api.Scratch
}

// TODO: ideally the decompile output would be diffed against the original source code

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
                    extensions={[basicSetup, cpp(), EditorState.readOnly.of(true)]}
                />
            </> : <Loading className={styles.loading} />}
        </section>
    </div>
}
