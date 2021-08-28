import { h, Fragment } from "preact"
import { useState, useEffect } from "preact/hooks"
import { useHistory } from "react-router-dom"

import * as api from "../api"
import Nav from "../Nav"
import Editor from "./Editor"
import Select from "../Select"
import { useLocalStorage } from "../hooks"
import styles from "./NewScratch.module.css"
import toast from "react-hot-toast"

export default function NewScratch() {
    const [awaitingResponse, setAwaitingResponse] = useState(false)
    const [errorMsg, setErrorMsg] = useState("")
    const [asm, setAsm] = useLocalStorage("NewScratch.asm", "")
    const [context, setContext] = useLocalStorage("NewScratch.context", "")
    const [arch, setArch] = useLocalStorage("NewScratch.arch", "mips")
    const history = useHistory()

    useEffect(() => {
        document.title = "New scratch"
    }, [])

    const submit = async () => {
        setErrorMsg("")

        if (awaitingResponse) {
            console.warn("create scratch action already in progress")
            return
        }

        try {
            setAwaitingResponse(true)
            const { slug } = await api.post("/scratch", {
                target_asm: asm,
                context: context || "",
                arch,
            })

            setErrorMsg("")
            setAsm("") // Clear the localStorage

            history.push(`/scratch/${slug}`)
            toast.success("Scratch created! You may share this url")
        } catch (error) {
            if (error?.responseJSON.as_errors) {
                setErrorMsg(error.responseJSON.as_errors.join("\n"))
            } else {
                console.error(error)
                setErrorMsg(error.message || error.toString())
            }
        } finally {
            setAwaitingResponse(false)
        }
    }

    return <>
        <Nav />
        <main class={styles.container}>
            <div class={styles.card}>
                <h1 class={`${styles.heading}`}>New scratch</h1>
                <p class={styles.description}>
                    Paste your function's target assembly below:
                </p>

                <div class={styles.targetasm}>
                    <Editor language="asm" value={asm} onChange={v => setAsm(v)} />
                </div>

                <p class={styles.description}>
                    Include any C context (structs, definitions, etc) below:
                </p>
                <div class={styles.targetasm}>
                    <Editor language="c" value={context} onChange={v => setContext(v)} />
                </div>

                <div class={`red ${styles.errormsg}`}>
                    {errorMsg}
                </div>

                <div class={styles.actions}>
                    <Select class={styles.compilerSelect} onChange={e => setArch((e.target as HTMLSelectElement).value)}>
                        <option value="mips">MIPS</option>
                    </Select>

                    <button disabled={(!asm && arch !== null) || awaitingResponse} onClick={submit}>Create scratch</button>
                </div>
            </div>
        </main>
    </>
}
