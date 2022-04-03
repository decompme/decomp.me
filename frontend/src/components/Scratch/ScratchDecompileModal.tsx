import { useEffect, useState } from "react"

import { cpp } from "@codemirror/lang-cpp"

import * as api from "../../lib/api"
import basicSetup from "../../lib/codemirror/basic-setup"
import Button from "../Button"
import CodeMirror from "../Editor/CodeMirror"
import Loading from "../loading.svg"
import Modal from "../Modal"

import styles from "./ScratchDecompileModal.module.scss"

export type Props = {
    open: boolean
    onClose?: () => void
    scratch: api.Scratch
    setSourceCode: (sourceCode: string) => void
}

export default function ScratchDecompileModal({ open, onClose, scratch, setSourceCode }: Props) {
    const [decompiledCode, setDecompiledCode] = useState<string | null>(null)

    useEffect(() => {
        if (open) {
            api.post(scratch.url + "/decompile", {
                context: scratch.context,
                compiler: scratch.compiler,
            }).then(({ decompilation }: { decompilation: string }) => {
                setDecompiledCode(decompilation)
            })
        } else {
            setDecompiledCode(null)
        }
    }, [open, scratch.compiler, scratch.context, scratch.url])

    return <Modal
        isOpen={open}
        onRequestClose={onClose}
        contentLabel="Rerun decompilation"
    >
        <div className={styles.container}>
            <section className={styles.main}>
                <h2>Rerun decompilation</h2>

                <p>This is generally useful when you've edited the function signature or symbols pertaining to the function.
                    This new decompilation should reflect your changes. </p>

                {(typeof decompiledCode == "string") ? <>
                    <CodeMirror
                        className={styles.editor}
                        value={decompiledCode}
                        onChange={c => setDecompiledCode(c)}
                        extensions={[basicSetup, cpp()]}
                    />
                    <p>Would you like to reset this scratch's source code to this newly decompiled iteration?</p>
                </> : <Loading className={styles.loading} />}
            </section>

            <div className={styles.actions}>
                <Button
                    primary
                    onClick={() => {
                        setSourceCode(decompiledCode)
                        onClose()
                    }}
                >
                    Reset it!
                </Button>
                <Button onClick={onClose}>Cancel</Button>
            </div>
        </div>
    </Modal>
}
