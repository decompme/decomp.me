import { h } from "preact"
import { useState } from "preact/hooks"
import { useHistory } from "react-router-dom"

import * as api from "../api"
import Editor from "./Editor"
import CompilerButton from "../compiler/CompilerButton"
import { useLocalStorage } from "../hooks"
import styles from "./NewScratch.module.css"
import toast from "react-hot-toast"

export default function NewScratch() {
    const [errorMsg, setErrorMsg] = useState()
    const [asm, setAsm] = useLocalStorage("NewScratch.asm")
    const [context, setContext] = useLocalStorage("NewScratch.context")
    const [compiler, setCompiler] = useLocalStorage("NewScratch.compiler")
    const history = useHistory()

    // TODO: loading state

    const submit = async () => {
        setErrorMsg("")
        
        try {
            const { slug } = await api.post("/scratch", {
                target_asm: asm,
                context: context,
                ...compiler,
            })

            setErrorMsg("")

            history.push(`/scratch/${slug}`)
            toast.success("Scratch created! You may share this url")
        } catch (error) {
            console.error(error)
            setErrorMsg(error.toString())
        }
    }

    return <div class={styles.container}>
        <div class={styles.card}>
            <h1 class={`${styles.heading}`}>New Scratch</h1>
            <p class={styles.description}>
                Paste your function's target assembly below:
            </p>

            <div class={styles.targetasm}>
                <Editor language="asm" value={asm} onChange={setAsm} />
            </div>
            
            <p class={styles.description}>
                Include any C context (structs, definitions, etc) below:
            </p>
            <div class={styles.targetasm}>
                <Editor language="c" value={context} onChange={setContext} />
            </div>

            <div class={styles.actions}>
                <p class={`red ${styles.errormsg}`}>
                    {errorMsg}
                </p>
                <CompilerButton value={compiler} onChange={setCompiler} />
                <button disabled={!asm && compiler !== null} onClick={submit}>Create scratch</button>
            </div>
        </div>
    </div>
}
