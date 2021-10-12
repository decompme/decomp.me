import { useEffect, useState, useMemo } from "react"

import Head from "next/head"
import { useRouter } from "next/router"

import AsyncButton from "../components/AsyncButton"
import Editor from "../components/Editor"
import Footer from "../components/Footer"
import Nav from "../components/Nav"
import Select from "../components/Select2"
import * as api from "../lib/api"

import styles from "./scratch.module.scss"

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
    const [asm, setAsm] = useState("")
    const [context, setContext] = useState("")
    const [arch, setArch] = useState("")
    const router = useRouter()
    const arches = api.useArches()

    const defaultLabel = useMemo(() => {
        const labels = getLabels(asm)
        return labels.length > 0 ? labels[labels.length - 1] : null
    }, [asm])
    const [label, setLabel] = useState<string>("")

    // Load fields from localStorage
    useEffect(() => {
        try {
            setLabel(JSON.parse(localStorage["NewScratch.label"] ?? "\"\""))
            setAsm(JSON.parse(localStorage["NewScratch.asm"] ?? "\"\""))
            setContext(JSON.parse(localStorage["NewScratch.context"] ?? "\"\""))
            setArch(JSON.parse(localStorage["NewScratch.arch"] ?? "\"\""))
        } catch (error) {
            console.warn("bad localStorage", error)
        }
    }, [])

    // Update localStorage
    useEffect(() => {
        localStorage["NewScratch.label"] = JSON.stringify(label)
        localStorage["NewScratch.asm"] = JSON.stringify(asm)
        localStorage["NewScratch.context"] = JSON.stringify(context)
        localStorage["NewScratch.arch"] = JSON.stringify(arch)
    }, [label, asm, context, arch])

    if (!arch) {
        setArch(Object.keys(arches)[0])
    }

    const submit = async () => {
        try {
            const scratch: api.Scratch = await api.post("/scratch", {
                target_asm: asm,
                context: context || "",
                arch,
                diff_label: label || defaultLabel || "",
            })

            localStorage["NewScratch.label"] = ""
            localStorage["NewScratch.asm"] = ""

            router.push(`/scratch/${scratch.slug}`)
        } catch (error) {
            if (error?.responseJSON?.as_errors) {
                throw new Error(error.responseJSON.as_errors.join("\n"))
            } else {
                console.error(error)
                throw error
            }
        }
    }

    return <>
        <Head>
            <title>New scratch | decomp.me</title>
        </Head>
        <Nav />
        <main className={styles.container}>
            <div className={styles.heading}>
                <h1>Create a new scratch</h1>
                <p>
                    A scratch is a playground where you can work on matching
                    a given target function using any compiler options you like.
                </p>
            </div>

            <hr className={styles.rule} />

            <div>
                <p className={styles.label}>
                    Architecture
                </p>
                {/* TODO: custom horizontal <options> */}
                <Select
                    options={arches}
                    value={arch}
                    onChange={a => setArch(a)}
                />
            </div>

            <hr className={styles.rule} />

            <div>
                <label className={styles.label} htmlFor="label">
                    Function name <small>(label as it appears in the target asm)</small>
                </label>
                <input
                    name="label"
                    type="text"
                    value={label}
                    placeholder={defaultLabel}
                    onChange={e => setLabel((e.target as HTMLInputElement).value)}
                    className={styles.textInput}
                />
            </div>
            <div className={styles.editorContainer}>
                <p className={styles.label}>Target assembly <small>(required)</small></p>
                <Editor
                    className={styles.editor}
                    language="mips"
                    lineNumbers={false}
                    value={asm}
                    onChange={setAsm}
                    padding={10}
                />
            </div>
            <div className={styles.editorContainer}>
                <p className={styles.label}>
                    Context <small>(typically generated with m2ctx.py)</small>
                </p>
                <Editor
                    className={styles.editor}
                    language="c"
                    value={context}
                    onChange={setContext}
                    padding={10}
                />
            </div>

            <hr className={styles.rule} />

            <div>
                <AsyncButton
                    primary
                    disabled={asm.length == 0}
                    onClick={submit}
                    errorPlacement="right-center"
                >
                    Create scratch
                </AsyncButton>
            </div>
        </main>
        <Footer />
    </>
}
