import { useState, useEffect, useRef } from "react"

import { useRouter } from "next/router"

import { RepoForkedIcon, SyncIcon, UploadIcon, ArrowRightIcon, ArrowLeftIcon } from "@primer/octicons-react"
import classNames from "classnames"
import * as resizer from "react-simple-resizer"
import useDeepCompareEffect from "use-deep-compare-effect"

import * as api from "../../lib/api"
import { useSize, useWarnBeforeUnload } from "../../lib/hooks"
import { getFinishedTrainings, getNextScenario, getPriorScenario, getScenarioDescriptionFromSlug, getScenarioNameFromSlug } from "../../lib/training"
import AsyncButton from "../AsyncButton"
import Button from "../Button"
import CompilerOpts, { CompilerOptsT } from "../compiler/CompilerOpts"
import Diff from "../Diff"
import Editor from "../Editor"
import { EditorInstance } from "../Editor/MonacoEditor"
import ScoreBadge from "../ScoreBadge"
import Tabs, { Tab } from "../Tabs"

import AboutScratch from "./AboutScratch"
import styles from "./Scratch.module.scss"

const LEFT_PANE_MIN_WIDTH = 400
const RIGHT_PANE_MIN_WIDTH = 400

let isClaiming = false

function ChooseACompiler({ platform, onCommit }: {
    platform: string
    onCommit: (opts: CompilerOptsT) => void
}) {
    const [compiler, setCompiler] = useState<CompilerOptsT>()

    return <div className={styles.chooseACompiler}>
        <CompilerOpts
            title="Choose a compiler"
            platform={platform}
            value={compiler}
            onChange={c => setCompiler(c)}
        />

        <div className={styles.chooseACompilerActions}>
            <Button primary onClick={() => onCommit(compiler)}>
                Use this compiler
                <ArrowRightIcon size={16} />
            </Button>
        </div>
    </div>
}

function renderRightTabs({ compilation }: {
    compilation?: api.Compilation
}): React.ReactElement<typeof Tab>[] {
    return [
        <Tab
            key="diff"
            label={<>
                Diff
                {compilation && <ScoreBadge
                    score={compilation?.diff_output?.current_score ?? -1}
                    maxScore={compilation?.diff_output?.max_score ?? -1} />}
            </>}
            className={styles.diffTab}
        >
            {compilation && <Diff compilation={compilation} />}
        </Tab>,
        /*<Tab key="options" label="Options">
            TODO
        </Tab>,*/
    ]
}

function renderLeftTabs({ scratch, setScratch }: {
    scratch: api.Scratch
    setScratch: (s: Partial<api.Scratch>) => void
}, trainingMode: boolean): React.ReactElement<typeof Tab>[] {
    const sourceEditor = useRef<EditorInstance>() // eslint-disable-line react-hooks/rules-of-hooks
    const contextEditor = useRef<EditorInstance>() // eslint-disable-line react-hooks/rules-of-hooks

    const sourceCodeTab = <Tab
        key="source"
        label="Source code"
        onSelect={() => sourceEditor.current && sourceEditor.current.focus()}
    >
        <Editor
            instanceRef={sourceEditor}
            className={styles.editor}
            language="c"
            value={scratch.source_code}
            onChange={value => {
                setScratch({ source_code: value })
            }}
            lineNumbers
            showMargin
            bubbleSuspense
        />
    </Tab>

    if (trainingMode)
        return [sourceCodeTab]

    return [
        <Tab key="about" label="About" className={styles.about}>
            <AboutScratch
                scratch={scratch}
                setScratch={scratch.owner?.is_you ? setScratch : null}
            />
        </Tab>,
        sourceCodeTab,
        <Tab
            key="context"
            label="Context"
            className={styles.context}
            onSelect={() => contextEditor.current && contextEditor.current.focus()}
        >
            <Editor
                instanceRef={contextEditor}
                className={styles.editor}
                language="c"
                value={scratch.context}
                onChange={value => {
                    setScratch({ context: value })
                }}
                lineNumbers
                showMargin
                bubbleSuspense
            />
        </Tab>,
        <Tab key="settings" label="Scratch settings">
            <CompilerOpts
                platform={scratch.platform}
                value={scratch}
                onChange={setScratch}
            />
        </Tab>,
    ]
}

export type Props = {
    slug: string
    onMatch?: (slug: string) => void
    tryClaim?: boolean // note: causes page reload after claiming
    trainingMode?: boolean
}

export default function Scratch({ slug, onMatch = () => {}, tryClaim, trainingMode = false }: Props) {
    const container = useSize<HTMLDivElement>()
    const { scratch, savedScratch, isSaved, setScratch, saveScratch } = api.useScratch(slug)
    const { compilation, isCompiling, compile } = api.useCompilation(scratch, savedScratch, true)
    const forkScratch = api.useForkScratchAndGo(savedScratch, scratch)
    const [leftTab, setLeftTab] = useState("source")
    const [rightTab, setRightTab] = useState("diff")
    const [isForking, setIsForking] = useState(false)
    const router = useRouter()

    // TODO: remove once scratch.compiler is no longer nullable
    const setCompilerOpts = ({ compiler, compiler_flags }: CompilerOptsT) => {
        setScratch({
            compiler,
            compiler_flags,
        })
        if (scratch.owner?.is_you)
            saveScratch()
    }

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key == "s") {
                event.preventDefault()

                if (!isSaved && scratch.owner?.is_you) {
                    saveScratch()
                }
            }
        }

        document.addEventListener("keydown", handler)
        return () => document.removeEventListener("keydown", handler)
    })

    useDeepCompareEffect(() => {
        if (scratch) {
            document.title = scratch.name || "Untitled scratch"

            if (!isSaved) {
                document.title += " (unsaved changes)"
            }

            document.title += " | decomp.me"
        }
    }, [scratch || {}, isSaved])

    useDeepCompareEffect(() => {
        if (compilation?.diff_output?.current_score === 0) {
            onMatch(slug)
        }
    }, [compilation || {}])

    useWarnBeforeUnload(
        !isSaved && !isForking && !trainingMode,
        scratch.owner?.is_you
            ? "You have not saved your changes to this scratch. Discard changes?"
            : "You have edited this scratch but not saved it in a fork. Discard changes?",
    )

    // Claim the scratch
    if (tryClaim && !savedScratch?.owner && typeof window !== "undefined") {
        if (isClaiming) {
            // Promise that never resolves, since the page will reload when the claim is done
            throw new Promise(() => {})
        }

        console.log("Claiming scratch", savedScratch)
        isClaiming = true

        throw api.post(`/scratch/${scratch.slug}/claim`, {})
            .then(({ success }) => {
                if (!success)
                    return Promise.reject(new Error("Scratch already claimed"))
            })
            .catch(console.error)
            .then(() => {
                window.location.reload()
            })
    }

    const leftTabs = renderLeftTabs({
        scratch,
        setScratch,
    }, trainingMode)

    const rightTabs = renderRightTabs({
        compilation,
    })

    return <div ref={container.ref} className={styles.container}>
        <div className={styles.toolbar}>
            {trainingMode ?
                <div className={classNames(styles.trainingScratchHeaderContainer, getFinishedTrainings().includes(slug) ? styles.completed : undefined)}>
                    <div className={styles.trainingScratchHeader}>
                        {getScenarioNameFromSlug(slug)}
                    </div>
                    <div className={classNames(styles.trainingScratchHeader, styles.trainingScratchHeaderDescription)}>
                        {getScenarioDescriptionFromSlug(slug)}
                    </div>
                    <div className={styles.trainingScratchButtonList}>
                        <Button disabled={!getPriorScenario(slug)} onClick={() => {
                            const priorSlug = getPriorScenario(slug)?.slug

                            if (priorSlug)
                                router.push(`/training/${priorSlug}`)
                        }}>
                            <ArrowLeftIcon size={16} /> Prior scenario
                        </Button>
                        <AsyncButton onClick={compile} forceLoading={isCompiling}>
                            <SyncIcon size={16} /> Compile
                        </AsyncButton>
                        <Button disabled={!getNextScenario(slug)} onClick={() => {
                            const nextSlug = getNextScenario(slug)?.slug

                            if (nextSlug)
                                router.push(`/training/${nextSlug}`)
                        }}>
                            Next scenario <ArrowRightIcon size={16} />
                        </Button>
                    </div>
                </div> :
                <>
                    <input
                        className={styles.scratchName}
                        type="text"
                        value={scratch.name}
                        onChange={event => setScratch({ name: event.target.value })}
                        disabled={!scratch.owner?.is_you}
                        spellCheck="false"
                        maxLength={100}
                        placeholder={"Untitled scratch"}
                    />
                    <AsyncButton onClick={compile} forceLoading={isCompiling}>
                        <SyncIcon size={16} /> Compile
                    </AsyncButton>
                </>
            }

            {(!trainingMode && scratch.owner?.is_you) && <AsyncButton onClick={() => {
                return Promise.all([
                    saveScratch(),
                    compile().catch(() => {}), // Ignore errors
                ])
            }} disabled={isSaved}>
                <UploadIcon size={16} /> Save
            </AsyncButton>}
            {!trainingMode && <AsyncButton onClick={() => {
                setIsForking(true)
                return forkScratch()
            }} primary={!isSaved && !scratch.owner?.is_you}>
                <RepoForkedIcon size={16} /> Fork
            </AsyncButton> }
        </div>

        {container.width > (LEFT_PANE_MIN_WIDTH + RIGHT_PANE_MIN_WIDTH)
            ? <resizer.Container className={styles.resizer}>
                <resizer.Section minSize={LEFT_PANE_MIN_WIDTH}>
                    <resizer.Container vertical style={{ height: "100%" }}>
                        <Tabs activeTab={leftTab} onChange={setLeftTab}>
                            {leftTabs}
                        </Tabs>
                    </resizer.Container>
                </resizer.Section>

                <resizer.Bar
                    size={1}
                    style={{
                        cursor: "col-resize",
                        background: "var(--a100)",
                    }}
                    expandInteractiveArea={{ left: 4, right: 4 }}
                />

                <resizer.Section className={styles.diffSection} minSize={RIGHT_PANE_MIN_WIDTH}>
                    {scratch.compiler === ""
                        ? <ChooseACompiler platform={scratch.platform} onCommit={setCompilerOpts} />
                        : <Tabs activeTab={rightTab} onChange={setRightTab}>
                            {rightTabs}
                        </Tabs>
                    }
                </resizer.Section>
            </resizer.Container>
            : (scratch.compiler === ""
                ? <ChooseACompiler platform={scratch.platform} onCommit={setCompilerOpts} />
                : <Tabs activeTab={leftTab} onChange={setLeftTab}>
                    {leftTabs}
                    {rightTabs}
                </Tabs>
            )}
    </div>
}
