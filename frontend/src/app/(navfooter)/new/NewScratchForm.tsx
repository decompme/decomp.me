"use client"

import { useEffect, useState, useMemo, useReducer, useRef } from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"

import AsyncButton from "@/components/AsyncButton"
import { useCompilersForPlatform } from "@/components/compiler/compilers"
import PresetSelect from "@/components/compiler/PresetSelect"
import CodeMirror from "@/components/Editor/CodeMirror"
import PlatformSelect from "@/components/PlatformSelect"
import Select from "@/components/Select2"
import * as api from "@/lib/api"
import { Library } from "@/lib/api/types"
import { scratchUrl } from "@/lib/api/urls"
import basicSetup from "@/lib/codemirror/basic-setup"
import { cpp } from "@/lib/codemirror/cpp"
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
    const [compilerId, setCompilerId] = useState<string>()
    const [compilerFlags, setCompilerFlags] = useState<string>("")
    const [diffFlags, setDiffFlags] = useState<string[]>([])
    const [libraries, setLibraries] = useState<Library[]>([])
    const [presetId, setPresetId] = useState<number | undefined>()

    const ready = useRef(false)

    const [valueVersion, incrementValueVersion] = useReducer(x => x + 1, 0)

    const router = useRouter()

    const defaultLabel = useMemo(() => {
        const labels = getLabels(asm)
        return labels.length > 0 ? labels[0] : null
    }, [asm])
    const [label, setLabel] = useState<string>("")

    const setPreset = (preset: api.Preset) => {
        if (preset) {
            setPresetId(preset.id)
            setPlatform(preset.platform)
            setCompilerId(preset.compiler)
            setCompilerFlags(preset.compiler_flags)
            setDiffFlags(preset.diff_flags)
            setLibraries(preset.libraries)
        } else {
            // User selected "Custom", don't change platform or compiler
            setPresetId(undefined)
            setCompilerFlags("")
            setDiffFlags([])
            setLibraries([])
        }
    }
    const setCompiler = (compiler?: string) => {
        setCompilerId(compiler)
        setCompilerFlags("")
        setDiffFlags([])
        setLibraries([])
        setPresetId(undefined)
    }

    const presets = useMemo(() => {
        const dict: Record<string, any> = {}
        for (const v of Object.values(serverCompilers.platforms)) {
            for (const p of v.presets) {
                dict[p.id] = p
            }
        }
        return dict
    }, [serverCompilers])

    // Load fields from localStorage
    useEffect(() => {
        try {
            setLabel(localStorage["new_scratch_label"] ?? "")
            setAsm(localStorage["new_scratch_asm"] ?? "")
            setContext(localStorage["new_scratch_context"] ?? "")
            const pid = parseInt(localStorage["new_scratch_presetId"])
            if (!isNaN(pid)) {
                const preset = presets[pid]
                if (preset) {
                    setPreset(preset)
                }
            } else {
                setPlatform(localStorage["new_scratch_platform"] ?? "")
                setCompilerId(localStorage["new_scratch_compilerId"] ?? undefined)
                setCompilerFlags(localStorage["new_scratch_compilerFlags"] ?? "")
                setDiffFlags(JSON.parse(localStorage["new_scratch_diffFlags"] ?? "[]"))
                setLibraries(JSON.parse(localStorage["new_scratch_libraries"] ?? "[]"))
            }
            incrementValueVersion()
        } catch (error) {
            console.warn("bad localStorage", error)
        }
        ready.current = true
    }, [presets])

    // Update localStorage
    useEffect(() => {
        if (!ready.current)
            return

        localStorage["new_scratch_label"] = label
        localStorage["new_scratch_asm"] = asm
        localStorage["new_scratch_context"] = context
        localStorage["new_scratch_platform"] = platform
        localStorage["new_scratch_compilerId"] = compilerId
        localStorage["new_scratch_compilerFlags"] = compilerFlags
        localStorage["new_scratch_diffFlags"] = JSON.stringify(diffFlags)
        localStorage["new_scratch_libraries"] = JSON.stringify(libraries)
        if (presetId == undefined) {
            localStorage.removeItem("new_scratch_presetId")
        } else {
            localStorage["new_scratch_presetId"] = presetId
        }
    }, [ready, label, asm, context, platform, compilerId, compilerFlags, diffFlags, libraries, presetId])

    // Use first available platform if no platform was selected or is unavailable
    if (!platform || Object.keys(serverCompilers.platforms).indexOf(platform) === -1) {
        setPlatform(Object.keys(serverCompilers.platforms)[0])
    }

    const platformCompilers = useCompilersForPlatform(platform, serverCompilers.compilers)
    useEffect(() => {
        if (!ready.current)
            return

        if (presetId != undefined || compilerId != undefined) {
            // User has specified a preset or compiler, don't override it
            return
        }

        if (Object.keys(platformCompilers).length === 0) {
            console.warn("This platform has no supported compilers", platform)
        } else {
            // Fall back to the first supported compiler and no flags...
            setCompiler(Object.keys(platformCompilers)[0])
            // However, if there is a preset for this platform, use it
            for (const v of Object.values(serverCompilers.compilers)) {
                if (v.platform === platform && serverCompilers.platforms[platform].presets.length > 0) {
                    setPreset(serverCompilers.platforms[platform].presets[0])
                    break
                }
            }
        }
    }, [ready, presetId, compilerId, platformCompilers, serverCompilers, platform])

    const compilersTranslation = useTranslation("compilers")
    const compilerChoiceOptions = useMemo(() => {
        return Object.keys(platformCompilers).reduce((sum, id) => {
            return {
                ...sum,
                [id]: compilersTranslation.t(id),
            }
        }, {})
    }, [platformCompilers, compilersTranslation])

    const submit = async () => {
        try {
            const scratch: api.ClaimableScratch = await api.post("/scratch", {
                target_asm: asm,
                context: context || "",
                platform,
                compiler: compilerId,
                compiler_flags: compilerFlags,
                diff_flags: diffFlags,
                libraries: libraries,
                preset: presetId,
                diff_label: label || defaultLabel || "",
            })

            localStorage["new_scratch_label"] = ""
            localStorage["new_scratch_asm"] = ""

            await api.claimScratch(scratch)

            router.push(scratchUrl(scratch))
        } catch (error) {
            console.error(error)
            throw error
        }
    }

    return <div>
        <div>
            <p className={styles.label}>
                Platform
            </p>
            <PlatformSelect
                platforms={serverCompilers.platforms}
                value={platform}
                onChange={p => {
                    setPlatform(p)
                    setCompiler()
                }}
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
                        options={compilerChoiceOptions}
                        value={compilerId}
                        onChange={setCompiler}
                    />
                </div>
                <div className={styles.compilerChoiceOr}>or</div>
                <div>
                    <span className={styles.compilerChoiceHeading}>Select a preset</span>
                    <PresetSelect
                        className={styles.compilerChoiceSelect}
                        platform={platform}
                        presetId={presetId}
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
                spellCheck={false}
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
