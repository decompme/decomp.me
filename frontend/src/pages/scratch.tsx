import { useState, useMemo } from "react"

import Head from "next/head"
import { useRouter } from "next/router"

import toast from "react-hot-toast"

import * as api from "../api"
import Nav from "../components/Nav"
import Editor from "../components/scratch/Editor"
import Select from "../components/Select"
import { useLocalStorage } from "../hooks"

import styles from "./scratch.module.scss"

// TODO: use AsyncButton with custom error handler?

function getLabels(asm: string): string[] {
    const lines = asm.split("\n")
    const labels = []

    for (const line of lines) {
        const match = line.match(/^\s*glabel\s+([a-zA-Z0-9_]+)\s*$/)
        if (match) {
            labels.push(match[1])
        }
    }

    return labels
}

export default function NewScratch() {
    const [awaitingResponse, setAwaitingResponse] = useState(false)
    const [errorMsg, setErrorMsg] = useState("")
    const [asm, setAsm] = useLocalStorage("NewScratch.asm", "")
    const [context, setContext] = useLocalStorage("NewScratch.context", "")
    const [arch, setArch] = useState<string>()
    const router = useRouter()
    const arches = api.useArches()

    const defaultLabel = useMemo(() => {
        const labels = getLabels(asm)
        return labels.length > 0 ? labels[labels.length - 1] : null
    }, [asm])
    const [label, setLabel] = useState<string>("")

    if (!arch) {
        setArch(Object.keys(arches)[0])
    }

    const submit = async () => {
        setErrorMsg("")

        if (awaitingResponse) {
            console.warn("create scratch action already in progress")
            return
        }

        try {
            setAwaitingResponse(true)
            const scratch: api.Scratch = await api.post("/scratch", {
                target_asm: asm,
                context: context || "",
                arch,
                diff_label: label || defaultLabel || "",
            })

            setErrorMsg("")
            setAsm("") // Clear the localStorage

            router.push(`/scratch/${scratch.slug}`)
            toast.success("Scratch created! You may share this url")
        } catch (error) {
            if (error?.responseJSON?.as_errors) {
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
        <Head>
            <title>New Scratch | decomp.me</title>
        </Head>
        <Nav />
        <main className={styles.container}>
            <div className={styles.card}>
                <h1 className={`${styles.heading}`}>New scratch</h1>
                <p className={styles.description}>
                    Paste your function&lsquo;s target assembly below:
                </p>

                <div className={styles.targetasm}>
                    <Editor language="asm" value={asm} onChange={v => setAsm(v)} />
                </div>

                <p className={styles.description}>
                    Include any C context (structs, definitions, etc) below:
                </p>
                <div className={styles.targetasm}>
                    <Editor language="c" value={context} onChange={v => setContext(v)} />
                </div>

                {errorMsg && <div className={`red ${styles.errormsg}`}>
                    {errorMsg}
                </div>}

                <div className={styles.actions}>
                    <Select className={styles.compilerSelect} onChange={e => setArch((e.target as HTMLSelectElement).value)}>
                        {Object.entries(arches).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </Select>

                    <div className={styles.textbox}>
                        <label>Label</label>
                        <input
                            type="text"
                            value={label}
                            placeholder={defaultLabel}
                            onChange={e => setLabel((e.target as HTMLInputElement).value)}
                        />
                    </div>

                    <span className={styles.actionspacer} />

                    <button disabled={(!asm && arch !== null) || awaitingResponse} onClick={submit}>Create scratch</button>
                </div>
            </div>
        </main>
    </>
}
