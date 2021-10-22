import { useState, useEffect, useRef } from "react"

import { RepoForkedIcon, SyncIcon, UploadIcon, ArrowRightIcon } from "@primer/octicons-react"
import * as resizer from "react-simple-resizer"
import useDeepCompareEffect from "use-deep-compare-effect"

import * as api from "../../lib/api"
import { useSize, useWarnBeforeUnload } from "../../lib/hooks"
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
                {compilation && <ScoreBadge score={compilation?.diff_output?.current_score ?? -1} />}
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
}): React.ReactElement<typeof Tab>[] {
    const sourceEditor = useRef<EditorInstance>() // eslint-disable-line react-hooks/rules-of-hooks
    const contextEditor = useRef<EditorInstance>() // eslint-disable-line react-hooks/rules-of-hooks

    return [
        <Tab key="about" label="About" className={styles.about}>
            <AboutScratch
                scratch={scratch}
                setScratch={scratch.owner?.is_you ? setScratch : null}
            />
        </Tab>,
        <Tab
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
        </Tab>,
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
    tryClaim?: boolean // note: causes page reload after claiming
}

export default function Scratch({ slug, tryClaim }: Props) {
    const container = useSize<HTMLDivElement>()
    const { scratch, savedScratch, isSaved, setScratch, saveScratch } = api.useScratch(slug)
    const { compilation, isCompiling, compile } = api.useCompilation(scratch, savedScratch, true)
    const forkScratch = api.useForkScratchAndGo(savedScratch, scratch)
    const [leftTab, setLeftTab] = useState("source")
    const [rightTab, setRightTab] = useState("diff")
    const [isForking, setIsForking] = useState(false)

    // TODO: remove once scratch.compiler is no longer nullable
    const setCompilerOpts = ({ compiler, cc_opts }: CompilerOptsT) => {
        setScratch({
            compiler,
            cc_opts,
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

    useWarnBeforeUnload(
        !isSaved && !isForking,
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
    })

    const rightTabs = renderRightTabs({
        compilation,
    })

    return <div ref={container.ref} className={styles.container}>
        <div className={styles.toolbar}>
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
            {scratch.owner?.is_you && <AsyncButton onClick={() => {
                return Promise.all([
                    saveScratch(),
                    compile().catch(() => {}), // Ignore errors
                ])
            }} disabled={isSaved}>
                <UploadIcon size={16} /> Save
            </AsyncButton>}
            <AsyncButton onClick={() => {
                setIsForking(true)
                return forkScratch()
            }} primary={!isSaved && !scratch.owner?.is_you}>
                <RepoForkedIcon size={16} /> Fork
            </AsyncButton>
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
