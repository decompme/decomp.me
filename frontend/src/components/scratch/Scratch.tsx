import { useState, useEffect, useCallback, useRef } from "react"

import Link from "next/link"

import { RepoForkedIcon, SyncIcon, UploadIcon, ArrowRightIcon } from "@primer/octicons-react"
import * as resizer from "react-simple-resizer"
import useDeepCompareEffect from "use-deep-compare-effect"

import * as api from "../../lib/api"
import { useSize, useWarnBeforeUnload } from "../../lib/hooks"
import AsyncButton from "../AsyncButton"
import Button from "../Button"
import CompilerButton from "../compiler/CompilerButton"
import CompilerOpts, { CompilerOptsT } from "../compiler/CompilerOpts"
import Diff from "../diff/Diff"
import Editor from "../Editor"
import Tabs, { Tab } from "../Tabs"
import UserLink from "../user/UserLink"

import styles from "./Scratch.module.css"

const LEFT_PANE_MIN_WIDTH = 400
const RIGHT_PANE_MIN_WIDTH = 400

let isClaiming = false

function ChooseACompiler({ arch, onCommit }: {
    arch: string,
    onCommit: (opts: CompilerOptsT) => void,
}) {
    const [compiler, setCompiler] = useState<CompilerOptsT>()

    return <div className={styles.chooseACompiler}>
        <CompilerOpts
            title="Choose a compiler"
            arch={arch}
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

function ScratchLink({ slug }: { slug: string }) {
    const { scratch } = api.useScratch(slug)

    if (!scratch) {
        return <span />
    }

    return <Link href={`/scratch/${scratch.slug}`}>
        <a className={styles.scratchLink}>
            {nameScratch(scratch)}
        </a>
    </Link>
}

function renderRightTabs({ compilation }: {
    compilation?: api.Compilation,
}): React.ReactElement<typeof Tab>[] {
    console.log(compilation)
    return [
        <Tab key="diff" label="Diff">
            {compilation && <Diff compilation={compilation} />}
        </Tab>,
        /*<Tab key="options" label="Options">
            TODO
        </Tab>,*/
    ]
}

function renderLeftTabs({ scratch, isSaved, setScratch, saveScratch, forkScratch, compile }: {
    scratch: api.Scratch,
    isSaved: boolean,
    setScratch: (s: Partial<api.Scratch>) => void,
    saveScratch: () => Promise<void>,
    forkScratch: () => Promise<void>,
    compile: () => Promise<void>,
}): React.ReactElement<typeof Tab>[] {
    return [
        <Tab key="about" label={scratch.owner.is_you ? "Scratch settings" : "About this scratch" }>
            <div className={styles.metadata}>
                {scratch.owner && <div>
                                    Owner
                    <UserLink user={scratch.owner} />
                </div>}

                {scratch.parent && <div>
                                    Fork of <ScratchLink slug={scratch.parent} />
                </div>}
            </div>
        </Tab>,
        <Tab key="source" label="Source code">
            <Editor
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
        <Tab key="context" label="Context" className={styles.context}>
            <Editor
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
    ]
}

export function nameScratch({ slug, owner }: api.Scratch): string {
    if (owner?.is_you) {
        return "Your scratch"
    } else if (owner && !api.isAnonUser(owner) && owner?.name) {
        return `${owner?.name}'s scratch`
    } else {
        return "Untitled scratch"
    }
}

export type Props = {
    slug: string,
    tryClaim?: boolean, // note: causes page reload after claiming
}

export default function Scratch({ slug, tryClaim }: Props) {
    const container = useSize<HTMLDivElement>()
    const { scratch, savedScratch, isSaved, setScratch, saveScratch } = api.useScratch(slug)
    const { compilation, isCompiling, compile } = api.useCompilation(scratch, savedScratch, true)
    const forkScratch = api.useForkScratchAndGo(scratch)
    const [leftTab, setLeftTab] = useState("about")
    const [rightTab, setRightTab] = useState("diff")

    const setCompilerOpts = ({ compiler, cc_opts }: CompilerOptsT) => {
        setScratch({
            compiler,
            cc_opts,
        })
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
            document.title = nameScratch(scratch)

            if (!isSaved) {
                document.title += " (unsaved changes)"
            }

            document.title += " | decomp.me"
        }
    }, [scratch || {}, isSaved])

    useWarnBeforeUnload(!isSaved, "You have unsaved changes. Are you sure you want to leave?")

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
                // Reload the entire page
                window.location.href = window.location.href
            })
    }

    const leftTabs = renderLeftTabs({
        scratch,
        isSaved,
        setScratch,
        saveScratch,
        forkScratch,
        compile,
    })

    const rightTabs = renderRightTabs({
        compilation,
    })

    return <div ref={container.ref} className={styles.container}>
        <div className={styles.toolbar}>
            <div className={styles.scratchName}>
                {nameScratch(scratch)}
            </div>

            <span className={styles.grow} />

            <AsyncButton onClick={compile} forceLoading={isCompiling}>
                <SyncIcon size={16} /> Compile
            </AsyncButton>
            {scratch.owner?.is_you && <AsyncButton onClick={() => {
                return Promise.all([
                    saveScratch(),
                    compile(),
                ])
            }} disabled={isSaved}>
                <UploadIcon size={16} /> Save
            </AsyncButton>}
            <AsyncButton onClick={forkScratch}>
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
                        ? <ChooseACompiler arch={scratch.arch} onCommit={setCompilerOpts} />
                        : <Tabs activeTab={rightTab} onChange={setRightTab}>
                            {rightTabs}
                        </Tabs>
                    }
                </resizer.Section>
            </resizer.Container>
            : (scratch.compiler === ""
                ? <ChooseACompiler arch={scratch.arch} onCommit={setCompilerOpts} />
                : <Tabs activeTab={leftTab} onChange={setLeftTab}>
                    {leftTabs}
                    {rightTabs}
                </Tabs>
            )}
    </div>
}
