import { h, Fragment } from "preact"
import { useEffect, useState, useRef } from "preact/hooks"
import { useDebouncedCallback }  from "use-debounce"
import * as resizer from "react-simple-resizer"
import toast from "react-hot-toast"
import Skeleton from "react-loading-skeleton"
import { RepoForkedIcon } from "@primer/octicons-react"

import * as api from "../api"
import CompilerConfigSelect from "./CompilerConfigSelect"
import Editor from "./Editor"
import { useLocalStorage } from "../hooks"

import styles from "./Scratch.module.css"

export default function Scratch({ slug }) {
    const [currentRequest, setCurrentRequest] = useState(null)
    const [showWarnings, setShowWarnings] = useLocalStorage("logShowWarnings", false) // TODO: pass as compile flag '-wall'?
    let [compilerConfig, setCompilerConfig] = useState(null)
    let [cCode, setCCode] = useState(null)
    let [cContext, setCContext] = useState(null)
    let [diff, setDiff] = useState(null)
    let [log, setLog] = useState(null)
    const [isYours, setIsYours] = useState(false)
    const codeResizeContainer = useRef(null)

    const compile = async () => {
        if (compilerConfig === null || cCode === null || cContext === null) {
            return
        }

        if (currentRequest) {
            console.warn("compile action already in progress")
            return
        }

        try {
            setCurrentRequest("compile")
            const { diff_output, errors } = await api.post(`/scratch/${slug}/compile`, {
                compiler_config: compilerConfig,
                source_code: cCode.replace(/\r\n/g, "\n"),
                context: cContext.replace(/\r\n/g, "\n"),
            })

            setLog(errors)
            setDiff(diff_output)
        } finally {
            setCurrentRequest(null)
        }
    }

    const save = async () => {
        if (!isYours) {
            // TODO: implicitly fork
            toast.error("You don't own this scratch, so you can't save over it.")
            toast.clear
            return
        }

        const promise = api.patch(`/scratch/${slug}`, {
            compiler_config: compilerConfig,
            source_code: cCode,
            context: cContext,
        }).catch(error => Promise.reject(error.message))

        toast.promise(promise, {
            loading: 'Saving...',
            success: 'Scratch saved!',
            error: 'Error saving scratch',
        })
    }

    useEffect(async () => {
        const { scratch, is_yours } = await api.get(`/scratch/${slug}`)

        setIsYours(is_yours)
        setCompilerConfig(scratch.compiler_config)
        setCContext(scratch.context)
        setCCode(scratch.source_code)
        
        compilerConfig = scratch.compiler_config
        cContext = scratch.context
        cCode = scratch.source_code
        compile()
    }, [slug])

    const debouncedCompile = useDebouncedCallback(compile, 1000, { leading: true, trailing: false })

    // Ctrl + S to save
    useEffect(() => {
        const handler = event => {
            if ((event.ctrlKey || event.metaKey) && event.key == "s") {
                event.preventDefault()

                const p = debouncedCompile()
                if (p) {
                    p.then(save)
                }
            }
        }

        document.addEventListener("keydown", handler)
        return () => document.removeEventListener("keydown", handler)
    })

    // FIXME: doesn't seem to work
    const toggleContextSection = () => {
        const r = codeResizeContainer.current.getResizer()

        if (r.getSectionSize(1) === 0) {
            r.resizeSection(1, { toSize: r.getTotalSize() / 2 })
        } else {
            r.resizeSection(1, { toSize: 0 })
        }
    }

    return <div class={styles.container}>
        <resizer.Container class={styles.resizer}>
            <resizer.Section>
                <resizer.Container vertical style={{ height: "100%" }} ref={codeResizeContainer}>
                    <resizer.Section minSize="4em">
                        <div class={styles.sectionHeader}>
                            Sourcecode
                            <span class={styles.grow}></span>
                            <button onClick={debouncedCompile} disabled={currentRequest}>
                                Compile
                            </button>
                            <button
                                onClick={save}
                                disabled={!isYours}
                                title={isYours ? "" : "You don't own this scratch."}
                            >
                                Save
                            </button>
                            <button
                                disabled
                                title="Forking is not yet implemented"
                            >
                                <RepoForkedIcon size={16} /> Fork
                            </button>

                            <CompilerConfigSelect
                                value={compilerConfig}
                                onChange={cc => {
                                    compilerConfig = cc
                                    setCompilerConfig(cc)
                                    compile()
                                }}
                            />
                        </div>

                        <Editor
                            value={cCode}
                            forceLoading={cCode === null}
                            onChange={value => {
                                setCCode(value)
                                debouncedCompile()
                            }}
                        />
                    </resizer.Section>

                    <resizer.Bar
                        style={{ cursor: 'row-resize' }}
                        onClick={toggleContextSection}
                    >
                        <div class={styles.sectionHeader}>
                            Context
                        </div>
                    </resizer.Bar>

                    <resizer.Section defaultSize={0} className={styles.context}>
                        <Editor
                            value={cContext}
                            forceLoading={cContext === null}
                            onChange={value => {
                                setCContext(value)
                                debouncedCompile()
                            }}
                        />
                    </resizer.Section>
                </resizer.Container>
            </resizer.Section>

            <resizer.Bar
                size={1}
                style={{
                    cursor: 'col-resize',
                    background: '#2e3032',
                }}
                expandInteractiveArea={{ left: 4, right: 4 }}
            />

            <resizer.Section className={styles.diffSection}>
                <div class={styles.sectionHeader}>
                    Diff {diff && <span class={styles.diffExplanation}>(left is target, right is your code)</span>}
                    <span class={styles.grow} />
                    <input type="checkbox" checked={showWarnings} onChange={() => setShowWarnings(!showWarnings)} name="showWarnings" />
                    <label for="showWarnings">Show warnings</label>
                </div>
                <div class={styles.output}>
                    {(diff === null && log === null) ? <Skeleton height={20} count={20} /> : <>
                        {(showWarnings || !diff) && <code class={styles.log}>{log}</code>}
                        <code class={styles.diff} dangerouslySetInnerHTML={{ __html: diff }} />
                    </>}
                </div>
            </resizer.Section>
        </resizer.Container>
    </div>
}
