import { h, Fragment } from "preact"
import { useEffect, useState, useRef } from "preact/hooks"
import { useDebouncedCallback }  from "use-debounce"
import * as resizer from "react-simple-resizer"
import toast from "react-hot-toast"
import Skeleton from "react-loading-skeleton"
import { RepoForkedIcon, SyncIcon, UploadIcon, ArrowRightIcon } from "@primer/octicons-react"
import { useParams, useHistory } from "react-router-dom"

import * as api from "../api"
import Nav from "../Nav"
import CompilerButton from "../compiler/CompilerButton"
import CompilerOpts, { CompilerOptsT } from "../compiler/CompilerOpts"
import Editor from "./Editor"
import { useLocalStorage, useSize } from "../hooks"

import styles from "./Scratch.module.css"

export default function Scratch() {
    // TODO: refactor this, this is stupidly big
    const { slug } = useParams<{ slug: string }>()
    const history = useHistory()
    const [currentRequest, setCurrentRequest] = useState("loading")
    const [showWarnings, setShowWarnings] = useLocalStorage("logShowWarnings", false) // TODO: pass as compile flag '-wall'?
    const [compiler, setCompiler] = useState(null)
    const isCompilerChosen = !(compiler && compiler.compiler === "")
    const [cCode, setCCode] = useState(null)
    const [cContext, setCContext] = useState(null)
    const [diff, setDiff] = useState(null)
    const [log, setLog] = useState(null)
    const [isYours, setIsYours] = useState(false)
    const [savedCompiler, setSavedCompiler] = useState(compiler)
    const [savedCCode, setSavedCCode] = useState(cCode)
    const [savedCContext, setSavedCContext] = useState(cContext)
    const codeResizeContainer = useRef<resizer.Container>(null)
    const { ref: diffSectionHeader, width: diffSectionHeaderWidth } = useSize<HTMLDivElement>()
    const [loadDate, setLoadDate] = useState(0) // maybe not needed

    const hasUnsavedChanges = savedCCode !== cCode || savedCContext !== cContext || JSON.stringify(savedCompiler) !== JSON.stringify(compiler)

    const owner = null // TODO: backend

    useEffect(() => {
        document.title = owner?.username ? `${owner?.username}'s scratch` : "Unknown scratch"
    }, [owner?.username])

    const compile = async () => {
        if (compiler === null || cCode === null || cContext === null) {
            return
        }

        if (!isCompilerChosen) {
            console.warn("Ignoring compile request; compiler not chosen")
            return
        }

        if (currentRequest === "compile") {
            console.warn("compile action already in progress")
            return
        }

        try {
            setCurrentRequest("compile")
            const { diff_output, errors } = await api.post(`/scratch/${slug}/compile`, {
                source_code: cCode.replace(/\r\n/g, "\n"),
                context: cContext === savedCContext ? undefined : cContext.replace(/\r\n/g, "\n"),
                ...compiler,
            })

            setLog(errors)
            setDiff(diff_output)
        } finally {
            setCurrentRequest(null)
        }
    }

    const save = async () => {
        if (!isYours) {
            // Implicitly fork
            return fork()
        }

        const promise = api.patch(`/scratch/${slug}`, {
            source_code: cCode,
            context: cContext,
            ...compiler,
        }).catch(error => Promise.reject(error.message))

        await toast.promise(promise, {
            loading: "Saving...",
            success: "Scratch saved!",
            error: "Error saving scratch",
        })

        setSavedCompiler(compiler)
        setSavedCCode(cCode)
        setSavedCContext(cContext)
    }

    const fork = async () => {
        const newScratch = await api.post(`/scratch/${slug}/fork`, {
            source_code: cCode,
            context: cContext,
            ...compiler,
        })

        history.push(`/scratch/${newScratch.slug}`)
        toast.success("Fork created!", {
            icon: "🍴",
        })
    }

    useEffect(() => {
        (async () => {
            const { scratch, is_yours } = await api.get(`/scratch/${slug}`)

            setIsYours(is_yours)
            setCompiler({
                compiler: scratch.compiler,
                cc_opts: scratch.cc_opts,
            })
            setCContext(scratch.context)
            setCCode(scratch.source_code)

            setSavedCompiler({
                compiler: scratch.compiler,
                cc_opts: scratch.cc_opts,
            })
            setSavedCCode(scratch.source_code)
            setSavedCContext(scratch.context)

            setLoadDate(Date.now())
        })()
    }, [slug])

    const debouncedCompile = useDebouncedCallback(compile, 500, { leading: false, trailing: true })
    const isCompiling = debouncedCompile.isPending() || currentRequest === "compile"

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

    useEffect(() => {
        debouncedCompile()
    }, [debouncedCompile, compiler?.compiler, compiler?.cc_opts])

    return <>
        <Nav />
        <main class={styles.container}>
            <resizer.Container className={styles.resizer}>
                <resizer.Section minSize={500}>
                    <resizer.Container
                        vertical
                        style={{ height: "100%" }}
                        // @ts-ignore
                        ref={codeResizeContainer}
                    >
                        <resizer.Section minSize={200} className={styles.sourceCode}>
                            <div class={styles.sectionHeader}>
                                Source
                                <span class={styles.grow} />
                                <button class={isCompiling ? styles.compiling : ""} onClick={compile} disabled={!isCompilerChosen}>
                                    <SyncIcon size={16} /> Compile
                                </button>
                                {isYours && <button onClick={save}>
                                    <UploadIcon size={16} /> Save
                                    {hasUnsavedChanges && "*"}
                                </button>}
                                <button onClick={fork}>
                                    <RepoForkedIcon size={16} /> Fork
                                </button>

                                <CompilerButton disabled={!isCompilerChosen} value={compiler} onChange={c => setCompiler(c)} />
                            </div>

                            <Editor
                                padding
                                value={cCode}
                                valueVersion={slug + loadDate}
                                forceLoading={cCode === null}
                                onChange={value => {
                                    setCCode(value)
                                    debouncedCompile()
                                }}
                            />
                        </resizer.Section>

                        <resizer.Bar
                            size={1}
                            style={{ cursor: "row-resize" }}
                            onClick={toggleContextSection}
                        >
                            <div class={styles.sectionHeader}>
                                Context
                            </div>
                        </resizer.Bar>

                        <resizer.Section defaultSize={0} className={styles.context}>
                            <Editor
                                padding
                                value={cContext}
                                valueVersion={slug + loadDate}
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
                        cursor: "col-resize",
                        background: "#2e3032",
                    }}
                    expandInteractiveArea={{ left: 4, right: 4 }}
                />

                <resizer.Section className={styles.diffSection} minSize={400}>
                    <div class={styles.sectionHeader} ref={diffSectionHeader}>
                        {isCompilerChosen && <>
                            Diff
                            {diffSectionHeaderWidth > 450 && <span class={diff ? `${styles.diffExplanation} ${styles.visible}` : styles.diffExplanation}>
                                (left is target, right is your code)
                            </span>}

                            <span class={styles.grow} />

                            <input type="checkbox" checked={showWarnings} onChange={() => setShowWarnings(!showWarnings)} name="showWarnings" />
                            <label for="showWarnings" onClick={() => setShowWarnings(!showWarnings)}>Show warnings</label>
                        </>}
                    </div>
                    <div class={styles.output}>
                        {(!isCompilerChosen) ? <>
                            <ChooseACompiler onCommit={setCompiler} />
                        </> : (diff === null && log === null)
                            ? <>
                                <Skeleton height={20} count={20} />
                            </> : <>
                                {(showWarnings || !diff) && <code class={styles.log}>{log}</code>}
                                <code class={styles.diff} dangerouslySetInnerHTML={{ __html: diff }} />
                            </>
                        }
                    </div>
                </resizer.Section>
            </resizer.Container>
        </main>
    </>
}

function ChooseACompiler({ onCommit }) {
    const [compiler, setCompiler] = useLocalStorage<CompilerOptsT>("ChooseACompiler.recent")

    return <div>
        <CompilerOpts
            title="Choose a compiler"
            value={compiler}
            onChange={c => setCompiler(c)}
        />

        <div style={{ padding: "1em", float: "right" }}>
            <button onClick={() => onCommit(compiler)}>
                Use this compiler
                <ArrowRightIcon size={16} />
            </button>
        </div>
    </div>
}
