"use client"

import { useEffect, useState, useMemo, useReducer } from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { cpp } from "@codemirror/lang-cpp"

import AsyncButton from "@/components/AsyncButton"
import { useCompilersForPlatform } from "@/components/compiler/compilers"
import PresetSelect from "@/components/compiler/PresetSelect"
import CodeMirror from "@/components/Editor/CodeMirror"
import PlatformSelect from "@/components/PlatformSelect"
import Select from "@/components/Select2"
import * as api from "@/lib/api"
import basicSetup from "@/lib/codemirror/basic-setup"
import useTranslation from "@/lib/i18n/translate"

import styles from "./new.module.scss"

function getLabels(asm: string): string[] {
    const lines = asm.split("\n")
    let labels = []

    const jtbl_label_regex = /(^L[0-9a-fA-F]{8}$)|(^jtbl_)/

    for (const line of lines) {
        let match = line.match(/^\s*glabel\s+([A-z0-9_]+)\s*/)
        if (match) {
            labels.push(match[1])
            continue
        }
        match = line.match(/^\s*\.global\s+([A-z0-9_]+)\s*/)
        if (match) {
            labels.push(match[1])
            continue
        }
        match = line.match(/^[A-z_]+_func_start\s+([A-z0-9_]+)/)
        if (match) {
            labels.push(match[1])
        }
    }

    labels = labels.filter(label => !jtbl_label_regex.test(label))

    return labels
}

export default function NewScratchForm({ serverCompilers }: {
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
    const [diffFlags, setDiffFlags] = useState<string[]>([])
    const [presetName, setPresetName] = useState<string>("")

    const [valueVersion, incrementValueVersion] = useReducer(x => x + 1, 0)

    const router = useRouter()

    const defaultLabel = useMemo(() => {
        const labels = getLabels(asm)
        return labels.length > 0 ? labels[0] : null
    }, [asm])
    const [label, setLabel] = useState<string>("")

    const setPreset = (preset: api.CompilerPreset) => {
        setCompiler(preset.compiler)
        setCompilerFlags(preset.flags)
        setDiffFlags(preset.diff_flags)
        setPresetName(preset.name)
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
            setDiffFlags(JSON.parse(localStorage["new_scratch_diffFlags"]) ?? [])
            setPresetName(localStorage["new_scratch_presetName"] ?? "")
            incrementValueVersion()
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
        localStorage["new_scratch_diffFlags"] = JSON.stringify(diffFlags)
        localStorage["new_scratch_presetName"] = presetName
    }, [label, asm, context, platform, compilerId, compilerFlags, diffFlags, presetName])

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
            setDiffFlags([])

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
                diff_flags: diffFlags,
                preset: presetName,
                diff_label: label || defaultLabel || "",
            })

            localStorage["new_scratch_label"] = ""
            localStorage["new_scratch_asm"] = ""

            await api.claimScratch(scratch)

            router.push(scratch.html_url)
        } catch (error) {
            console.error(error)
            throw error
        }
    }

    const compilersTranslation = useTranslation("compilers")

    return <div>
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
                                [id]: compilersTranslation.t(id),
                            }
                        }, {})}
                        value={compilerId}
                        onChange={c => {
                            setCompiler(c)
                            setCompilerFlags("")
                            setDiffFlags([])
                        }}
                    />
                </div>
                <div className={styles.compilerChoiceOr}>or</div>
                <div>
                    <span className={styles.compilerChoiceHeading}>Select a preset</span>
                    <PresetSelect
                        className={styles.compilerChoiceSelect}
                        platform={platform}
                        presetName={presetName}
                        setPreset={setPreset}
                        serverPresets={platform && serverCompilers.platforms[platform].presets}
                    />
                </div>
            </div>
        </div>

        <div>
            <label className={styles.label} htmlFor="label">
                Diff label <small>(asm label from which the diff will begin)</small>
            </label>
            <input
                name="label"
                type="text"
                value={label}
                placeholder={defaultLabel}
                onChange={e => setLabel((e.target as HTMLInputElement).value)}
                className={styles.textInput}
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
            />
        </div>
        <div className={styles.editorContainer}>
            <p className={styles.label}>Target assembly <small>(required)</small></p>
            <CodeMirror
                className={styles.editor}
                value={asm}
                valueVersion={valueVersion}
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
                valueVersion={valueVersion}
                onChange={setContext}
                extensions={[basicSetup, cpp()]}
            />
        </div>

        <div>
            <AsyncButton
                primary
                disabled={asm.length == 0}
                onClick={submit}
                errorPlacement="right-center"
                className="mt-2"
            >
                Create scratch
            </AsyncButton>
            <p className={styles.privacyNotice}>
                decomp.me will store any data you submit and link it to your session.<br />
                For more information, see our <Link href="/privacy">privacy policy</Link>.
            </p>
        </div>
    </div>
}
