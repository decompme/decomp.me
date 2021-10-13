import { useEffect, useState, useMemo } from "react"

import { GetStaticProps } from "next"

import Head from "next/head"
import { useRouter } from "next/router"

import ArchSelect from "../../components/ArchSelect"
import AsyncButton from "../../components/AsyncButton"
import { useCompilersForArch } from "../../components/compiler/compilers"
import PresetSelect, { PRESETS } from "../../components/compiler/PresetSelect"
import Editor from "../../components/Editor"
import Footer from "../../components/Footer"
import Nav from "../../components/Nav"
import Select from "../../components/Select2"
import * as api from "../../lib/api"

import styles from "./new.module.scss"

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

export const getStaticProps: GetStaticProps = async _context => {
    const data = await api.get("/compilers")

    return {
        props: {
            serverCompilers: data,
        },
    }
}

export default function NewScratch({ serverCompilers }: {
    serverCompilers: {
        arches: {
            [key: string]: string,
        },
        compilers: {
            [key: string]: {
                arch: string,
            },
        },
    },
}) {
    const [asm, setAsm] = useState("")
    const [context, setContext] = useState("")
    const [arch, setArch] = useState("")
    const [compiler, setCompiler] = useState<string>()
    const [compilerOpts, setCompilerOpts] = useState<string>("")
    const router = useRouter()

    const defaultLabel = useMemo(() => {
        const labels = getLabels(asm)
        return labels.length > 0 ? labels[labels.length - 1] : null
    }, [asm])
    const [label, setLabel] = useState<string>("")

    const [lineNumbers, setLineNumbers] = useState(false)

    // Load fields from localStorage
    useEffect(() => {
        try {
            setLabel(JSON.parse(localStorage["NewScratch.label"] ?? "\"\""))
            setAsm(JSON.parse(localStorage["NewScratch.asm"] ?? "\"\""))
            setContext(JSON.parse(localStorage["NewScratch.context"] ?? "\"\""))
            setArch(JSON.parse(localStorage["NewScratch.arch"] ?? "\"\""))
            setCompiler(JSON.parse(localStorage["NewScratch.compiler"] ?? undefined))
            setCompilerOpts(JSON.parse(localStorage["NewScratch.compilerOpts"] ?? "\"\""))
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
        localStorage["NewScratch.compiler"] = JSON.stringify(compiler)
        localStorage["NewScratch.compilerOpts"] = JSON.stringify(compilerOpts)
    }, [label, asm, context, arch, compiler, compilerOpts])

    const compilers = useCompilersForArch(arch, serverCompilers.compilers)
    const compilerModule = compilers?.find(c => c.id === compiler)

    if (!arch) {
        setArch(Object.keys(serverCompilers.arches)[0])
    }

    if (!compilerModule) { // We just changed architectures, probably
        // Fall back to the first supported compiler and no opts
        setCompiler(compilers[0].id)
        setCompilerOpts("")

        // If there is a preset that uses a supported compiler, default to it
        for (const preset of PRESETS) {
            if (compilers.find(c => c.id === preset.compiler)) {
                setCompiler(preset.compiler)
                setCompilerOpts(preset.opts)
                break
            }
        }
    }

    const submit = async () => {
        try {
            const scratch: api.Scratch = await api.post("/scratch", {
                target_asm: asm,
                context: context || "",
                arch,
                compiler,
                cc_opts: compilerOpts,
                diff_label: label || defaultLabel || "",
            })

            localStorage["NewScratch.label"] = ""
            localStorage["NewScratch.asm"] = ""

            router.push(`/scratch/${scratch.slug}`)
        } catch (error) {
            setLineNumbers(true) // line numbers are likely relevant to the error
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
                <ArchSelect
                    arches={serverCompilers.arches}
                    value={arch}
                    onChange={a => setArch(a)}
                />
            </div>

            <div>
                <p className={styles.label}>
                    Compiler
                </p>
                <div className={styles.compilerContainer}>
                    <div>
                        <span className={styles.compilerChoiceHeading}>Select a compiler</span>
                        <Select
                            className={styles.compilerChoiceSelect}
                            options={compilers.reduce((options, compiler) => {
                                return {
                                    ...options,
                                    [compiler.id]: compiler.name,
                                }
                            }, {})}
                            value={compiler}
                            onChange={c => {
                                setCompiler(c)
                                setCompilerOpts("")
                            }}
                        />
                    </div>
                    <div className={styles.compilerChoiceOr}>or</div>
                    <div>
                        <span className={styles.compilerChoiceHeading}>Select a preset</span>
                        <PresetSelect
                            className={styles.compilerChoiceSelect}
                            arch={arch}
                            compiler={compiler}
                            opts={compilerOpts}
                            setCompiler={setCompiler}
                            setOpts={setCompilerOpts}
                            serverCompilers={serverCompilers.compilers}
                        />
                    </div>
                </div>
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
                    value={asm}
                    onChange={setAsm}
                    padding={10}
                    showMargin={lineNumbers}
                    lineNumbers={lineNumbers}
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
                    showMargin={lineNumbers}
                    lineNumbers={lineNumbers}
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
