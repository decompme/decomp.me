import { useEffect } from "react"

import Link from "next/link"

import { RepoForkedIcon, SyncIcon, UploadIcon, ArrowRightIcon } from "@primer/octicons-react"
import * as resizer from "react-simple-resizer"
import useDeepCompareEffect from "use-deep-compare-effect"

import * as api from "../../api"
import CompilerButton from "../../compiler/CompilerButton"
import CompilerOpts, { CompilerOptsT } from "../../compiler/CompilerOpts"
import { useLocalStorage } from "../../hooks"
import AsyncButton from "../AsyncButton"
import Diff from "../diff/Diff"
import UserLink from "../user/UserLink"

import Editor from "./Editor"
import styles from "./Scratch.module.css"

function ChooseACompiler({ onCommit }: { onCommit: (opts: CompilerOptsT) => void }) {
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

function ScratchLink({ slug }: { slug: string }) {
    const { scratch } = api.useScratch(slug)

    if (!scratch) {
        return <span />
    }

    return <Link href={`/scratch/${scratch.slug}`}>
        <a>{nameScratch(scratch)}</a>
    </Link>
}

function DiffExplanation() {
    return <span className={`${styles.diffExplanation} ${styles.visible}`}>
        (left is target, right is your code)
    </span>
}

export function nameScratch({ slug, owner }: api.Scratch): string {
    if (owner?.is_you) {
        return "your scratch"
    } else if (owner && !api.isAnonUser(owner) && owner?.name) {
        return `${owner?.name}'s scratch`
    } else {
        return `scratch ${slug}`
    }
}

export type Props = {
    scratch: api.Scratch,
}

export default function Scratch({ scratch: initialScratch }: Props) {
    const { scratch, savedScratch, version, isSaved, setScratch, saveScratch, error } = api.useScratch(initialScratch)
    const { compilation, isCompiling, compile } = api.useCompilation(scratch, savedScratch, true)
    const forkScratch = api.useForkScratchAndGo(scratch)
    const compilers = api.useCompilers()

    const setCompilerOpts = ({ compiler, cc_opts }: CompilerOptsT) => {
        setScratch({
            compiler,
            cc_opts,
        })
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

    if (error?.status === 404) {
        // TODO
        return <div className={styles.container}>
            Scratch not found
        </div>
    } else if (!scratch) {
        // TODO
        return <div className={styles.container}>
            Loading scratch...
        </div>
    }

    const arch = compilers[scratch.compiler]?.arch

    return <div className={styles.container}>
        <resizer.Container className={styles.resizer}>
            <resizer.Section minSize={500}>
                <resizer.Container
                    vertical
                    style={{ height: "100%" }}
                >
                    <resizer.Section minSize={200} className={styles.sourceCode}>
                        <div className={styles.sectionHeader}>
                            Source
                            <span className={styles.grow} />

                            {scratch.compiler !== "" && <>
                                <AsyncButton onPress={compile} forceLoading={isCompiling}>
                                    <SyncIcon size={16} /> Compile
                                </AsyncButton>
                                <CompilerButton arch={arch} value={scratch} onChange={setCompilerOpts} />
                            </>}
                        </div>

                        <div className={styles.metadata}>
                            {scratch.owner && <div>
                                Owner
                                <UserLink user={scratch.owner} />
                            </div>}

                            {scratch.parent && <div>
                                Fork of <ScratchLink slug={scratch.parent} />
                            </div>}

                            <div>
                                {scratch.owner?.is_you && <AsyncButton onPress={() => {
                                    return Promise.all([
                                        saveScratch(),
                                        compile(),
                                    ])
                                }} disabled={isSaved}>
                                    <UploadIcon size={16} /> Save
                                </AsyncButton>}
                                <AsyncButton onPress={forkScratch}>
                                    <RepoForkedIcon size={16} /> Fork
                                </AsyncButton>
                            </div>
                        </div>

                        <Editor
                            padding
                            language="c"
                            value={scratch.source_code}
                            valueVersion={`${scratch.slug}:${version}`}
                            onChange={value => {
                                setScratch({ source_code: value })
                            }}
                        />
                    </resizer.Section>

                    <resizer.Bar
                        size={1}
                        style={{ cursor: "row-resize" }}
                    >
                        <div className={styles.sectionHeader}>
                            Context
                        </div>
                    </resizer.Bar>

                    <resizer.Section defaultSize={0} className={styles.context}>
                        <Editor
                            padding
                            language="c"
                            value={scratch.context}
                            valueVersion={`${scratch.slug}:${version}`}
                            onChange={value => {
                                setScratch({ context: value })
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
                {scratch.compiler === "" ? <ChooseACompiler onCommit={setCompilerOpts} /> : <>
                    <div className={styles.sectionHeader}>
                        Diff
                        {compilation && <DiffExplanation />}
                    </div>
                    {compilation && <Diff compilation={compilation} /> /* TODO: loading spinner */}
                </>}
            </resizer.Section>
        </resizer.Container>
    </div>
}
