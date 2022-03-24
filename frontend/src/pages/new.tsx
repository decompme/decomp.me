import { useEffect, useState, useMemo } from "react"

import { GetStaticProps } from "next"

import Link from "next/link"
import { useRouter } from "next/router"

import { basicSetup } from "@codemirror/basic-setup"
import { cpp } from "@codemirror/lang-cpp"
import { usePlausible } from "next-plausible"
import useTranslation from "next-translate/useTranslation"

import AsyncButton from "../components/AsyncButton"
import { useCompilersForPlatform } from "../components/compiler/compilers"
import PresetSelect from "../components/compiler/PresetSelect"
import CodeMirror from "../components/Editor/CodeMirror"
import Footer from "../components/Footer"
import Nav from "../components/Nav"
import PageTitle from "../components/PageTitle"
import PlatformSelect from "../components/PlatformSelect"
import Select from "../components/Select2"
import * as api from "../lib/api"

import styles from "./new.module.scss"

function getLabels(asm: string): string[] {
    const lines = asm.split("\n")
    let labels = []

    const jtbl_label_regex = /L[0-9a-fA-F]{8}/

    for (const line of lines) {
        let match = line.match(/^\s*glabel\s+([A-z0-9_]+)\s*$/)
        if (match) {
            labels.push(match[1])
            continue
        }
        match = line.match(/^\s*\.global\s+([A-z0-9_]+)\s*$/)
        if (match) {
            labels.push(match[1])
            continue
        }
        match = line.match(/^[A-z_]+_func_start\s+([A-z0-9_]+)$/)
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
            [id: string]: api.Platform
        }
        compilers: {
            [id: string]: api.Compiler
        }
    }
}) {
    const [asm, setAsm] = useState("")
    const [context, setContext] = useState("")
    const [platform, setPlatform] = useState("")
    const [compilerId, setCompiler] = useState<string>()
    const [compilerFlags, setCompilerFlags] = useState<string>("")

    const router = useRouter()
    const plausible = usePlausible()

    const defaultLabel = useMemo(() => {
        const labels = getLabels(asm)
        return labels.length > 0 ? labels[labels.length - 1] : null
    }, [asm])
    const [label, setLabel] = useState<string>("")

    const setPreset = (preset: api.CompilerPreset) => {
        setCompiler(preset.compiler)
        setCompilerFlags(preset.flags)
    }

    // Load fields from localStorage
    useEffect(() => {
        try {
            setLabel(localStorage["new_scratch_label"] ?? "")
            setAsm(localStorage["new_scratch_asm"] ?? "")
            setContext(localStorage["new_scratch_context"] ?? "")
            setPlatform(localStorage["new_scratch_platform"] ?? "")
            setCompiler(localStorage["new_scratch_compiler"] ?? undefined)
            setCompilerFlags(localStorage["new_scratch_compilerFlags"] ?? "")
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
        localStorage["new_scratch_compiler"] = compilerId
        localStorage["new_scratch_compilerFlags"] = compilerFlags
    }, [label, asm, context, platform, compilerId, compilerFlags])

    const platformCompilers = useCompilersForPlatform(platform, serverCompilers.compilers)
    const compiler = platformCompilers[compilerId]

    // wtf
    if (!platform || Object.keys(serverCompilers.platforms).indexOf(platform) === -1) {
        setPlatform(Object.keys(serverCompilers.platforms)[0])
    }

    if (!compiler) { // We just changed platforms, probably
        if (Object.keys(platformCompilers).length === 0) {
            console.warn("No compilers supported for platform", platform)
        } else {
            // Fall back to the first supported compiler and no flags
            setCompiler(Object.keys(platformCompilers)[0])
            setCompilerFlags("")

            // If there is a preset for this platform, use it
            for (const [k, v] of Object.entries(serverCompilers.compilers)) {
                if (v.platform === platform && serverCompilers.platforms[platform].presets.length > 0) {
                    setCompiler(k)
                    setPreset(serverCompilers.platforms[platform].presets[0])
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
                compiler: compilerId,
                compiler_flags: compilerFlags,
                diff_label: label || defaultLabel || "",
            })

            localStorage["new_scratch_label"] = ""
            localStorage["new_scratch_asm"] = ""

            await api.claimScratch(scratch)

            plausible("createScratch", { props: { platform, compiler: compilerId, url: scratch.html_url } })

            await router.push(scratch.html_url)
        } catch (error) {
            console.error(error)
            throw error
        }
    }

    const { t } = useTranslation()

    return <>
        <PageTitle title="New scratch" />
        <Nav />
        <header className={styles.heading}>
            <div className={styles.headingInner}>
                <h1>Start a new scratch</h1>
                <p>
                A scratch is a playground where you can work on matching
                a given target function using any compiler options you like.
                </p>
            </div>
        </header>
        <main className={styles.container}>
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
                            options={Object.keys(platformCompilers).reduce((sum, id) => {
                                return {
                                    ...sum,
                                    [id]: t(`compilers:${id}`),
                                }
                            }, {})}
                            value={compilerId}
                            onChange={c => {
                                setCompiler(c)
                                setCompilerFlags("")
                            }}
                        />
                    </div>
                    <div className={styles.compilerChoiceOr}>or</div>
                    <div>
                        <span className={styles.compilerChoiceHeading}>Select a preset</span>
                        <PresetSelect
                            className={styles.compilerChoiceSelect}
                            platform={platform}
                            flags={compilerFlags}
                            setPreset={setPreset}
                            serverPresets={platform && serverCompilers.platforms[platform].presets}
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
                <CodeMirror
                    className={styles.editor}
                    value={asm}
                    onChange={setAsm}
                    extensions={basicSetup}
                />
            </div>
            <div className={styles.editorContainer}>
                <p className={styles.label}>
                    Context <small>(any typedefs, structs, and declarations you would like to include go here; typically generated with m2ctx.py)</small>
                </p>
                <CodeMirror
                    className={styles.editor}
                    value={context}
                    onChange={setContext}
                    extensions={[basicSetup, cpp()]}
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
                <p className={styles.privacyNotice}>
                    decomp.me will store any data you submit and link it to your session.<br />
                    For more information, see our <Link href="/privacy">privacy policy</Link>.
                </p>
            </div>
        </main>
        <Footer />
    </>
}
