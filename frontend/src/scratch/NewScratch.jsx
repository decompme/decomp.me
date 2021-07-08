import { h } from "preact"
import { useState } from "preact/hooks"
import { route } from "preact-router"

import * as api from "../api"
import Editor from "./Editor"
import CompilerConfigSelect from "./CompilerConfigSelect"

import styles from "./NewScratch.module.css"

export default function NewScratch() {
    const [errorMsg, setErrorMsg] = useState("")
    const [asm, setAsm] = useState()
    const [compilerConfig, setCompilerConfig] = useState()

    // TODO: loading state

    const submit = async () => {
        setErrorMsg("")
        
        try {
            const { slug } = await api.post("/scratch", {
                target_asm: asm,
                compiler_config: compilerConfig,
            })

            setErrorMsg("")

            route(`/scratch/${slug}`)
        } catch (error) {
            console.error(error)
            setErrorMsg("an error occurred :/")
        }
    }

    return <div class={styles.container}>
        <div class={styles.card}>
            <h1 class={`glow ${styles.heading}`}>New Scratch</h1>
            <p class={styles.description}>
                Paste your function's <span class="white glow">target assembly</span> below to begin decomping!
            </p>

            <div class={styles.targetasm}>
                <Editor language="asm" value={asm} onChange={setAsm} />
            </div>

            <div class={styles.actions}>
                <p class={`red ${styles.errormsg}`}>
                    {errorMsg}
                </p>
                <div class={styles.compilerselect}>
                    <CompilerConfigSelect value={compilerConfig} onChange={setCompilerConfig} />
                </div>
                <button disabled={!asm && compilerConfig !== null} onClick={submit}>use this asm</button>
            </div>
        </div>
    </div>
}
