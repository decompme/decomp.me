import { useEffect, useState, useMemo } from "react"

import { GetStaticProps } from "next"

import Head from "next/head"
import { useRouter } from "next/router"

import AsyncButton from "../../components/AsyncButton"
import { CompilerPreset } from "../../components/compiler/CompilerOpts"
import { useCompilersForPlatform } from "../../components/compiler/compilers"
import PresetSelect, { PRESETS } from "../../components/compiler/PresetSelect"
import Editor from "../../components/Editor"
import Footer from "../../components/Footer"
import Nav from "../../components/Nav"
import PlatformSelect from "../../components/PlatformSelect"
import Select from "../../components/Select2"
import * as api from "../../lib/api"

import styles from "./new.module.scss"

function getLabels(asm: string): string[] {
    const lines = asm.split("\n")
    let labels = []

    const jtbl_label_regex = /L[0-9a-fA-F]{8}/

    for (const line of lines) {
        let match = line.match(/^\s*glabel\s+([a-zA-Z0-9_]+)\s*$/)
        if (match) {
            labels.push(match[1])
            continue
        }
        match = line.match(/^\s*\.global\s+([a-zA-Z0-9_]+)\s*$/)
        if (match) {
            labels.push(match[1])
        }
    }

    labels = labels.filter(label => !jtbl_label_regex.test(label))

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
        platforms: {
            [key: string]: {
                name: string
                description: string
            }
        }
        compilers: {
            [key: string]: {
                platform: string
            }
        }
    }
}) {
    const [asm, setAsm] = useState("")
    const [context, setContext] = useState("")
    const [platform, setPlatform] = useState("")
    const [compiler, setCompiler] = useState<string>()
    const [compilerOpts, setCompilerOpts] = useState<string>("")
    const router = useRouter()

    const defaultLabel = useMemo(() => {
        const labels = getLabels(asm)
        return labels.length > 0 ? labels[labels.length - 1] : null
    }, [asm])
    const [label, setLabel] = useState<string>("")

    const [lineNumbers, setLineNumbers] = useState(false)

    const setPreset = (preset: CompilerPreset) => {
        setCompiler(preset.compiler)
        setCompilerOpts(preset.opts)
    }

    // Load fields from localStorage
    useEffect(() => {
        try {
            setLabel(localStorage["new_scratch_label"] ?? "")
            setAsm(localStorage["new_scratch_asm"] ?? "")
            setContext(localStorage["new_scratch_context"] ?? "")
            setPlatform(localStorage["new_scratch_platform"] ?? "")
            setCompiler(localStorage["new_scratch_compiler"] ?? undefined)
            setCompilerOpts(localStorage["new_scratch_compilerOpts"] ?? "")
        } catch (error) {
            console.warn("bad localStorage", error)
        }
    }, [])

    // Update localStorage
    useEffect(() => {
        localStorage["new_scratch_label"] = label
        localStorage["new_scratch_asm"] = asm
        localStorage["new_scratch_context"] = context
        localStorage["new_scratch_platform"] = platform
        localStorage["new_scratch_compiler"] = compiler
        localStorage["new_scratch_compilerOpts"] = compilerOpts
    }, [label, asm, context, platform, compiler, compilerOpts])

    const compilers = useCompilersForPlatform(platform, serverCompilers.compilers)
    const compilerModule = compilers?.find(c => c.id === compiler)

    if (!platform || Object.keys(serverCompilers.platforms).indexOf(platform) === -1) {
        setPlatform(Object.keys(serverCompilers.platforms)[0])
    }

    if (!compilerModule) { // We just changed platforms, probably
        if (compilers.length === 0) {
            console.warn("No compilers supported for platform", platform)
        } else {
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
    }

    const submit = async () => {
        try {
            const scratch: api.Scratch = await api.post("/scratch", {
                target_asm: asm,
                context: context || "",
                platform,
                compiler,
                compiler_flags: compilerOpts,
                diff_label: label || defaultLabel || "",
            })

            localStorage["new_scratch_label"] = ""
            localStorage["new_scratch_asm"] = ""

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
                    Platform
                </p>
                <PlatformSelect
                    platforms={serverCompilers.platforms}
                    value={platform}
                    onChange={a => setPlatform(a)}
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
                            platform={platform}
                            compiler={compiler}
                            opts={compilerOpts}
                            setPreset={setPreset}
                            serverCompilers={serverCompilers.compilers}
                        />
                    </div>
                </div>
            </div>

            <hr className={styles.rule} />

            <div>
                <label className={styles.label} htmlFor="label">
                    Function name <small>(asm label from which the diff will begin)</small>
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
                    Context <small>(any typedefs, structs, and declarations you would like to include go here; typically generated with m2ctx.py)</small>
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
