import { useState, useRef } from "react"

import { RepoForkedIcon, SyncIcon, UploadIcon } from "@primer/octicons-react"
import * as resizer from "react-simple-resizer"

import * as api from "../../lib/api"
import { useSize } from "../../lib/hooks"
import AsyncButton from "../AsyncButton"
import CompilerOpts from "../compiler/CompilerOpts"
import Diff from "../Diff"
import Editor from "../Editor"
import { EditorInstance } from "../Editor/MonacoEditor"
import ScoreBadge from "../ScoreBadge"
import Tabs, { Tab } from "../Tabs"

import AboutScratch from "./AboutScratch"
import styles from "./Scratch.module.scss"

const LEFT_PANE_MIN_WIDTH = 400
const RIGHT_PANE_MIN_WIDTH = 400

function renderRightTabs({ compilation }: {
    compilation: api.Compilation | undefined
}): React.ReactElement<typeof Tab>[] {
    return [
        <Tab
            key="diff"
            id="diff"
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
}): React.ReactElement<typeof Tab>[] {
    const sourceEditor = useRef<EditorInstance>() // eslint-disable-line react-hooks/rules-of-hooks
    const contextEditor = useRef<EditorInstance>() // eslint-disable-line react-hooks/rules-of-hooks

    return [
        <Tab key="about" id="about" label="About" className={styles.about}>
            <AboutScratch
                scratch={scratch}
                setScratch={scratch.owner?.is_you ? setScratch : undefined}
            />
        </Tab>,
        <Tab
            key="source"
            id="source"
            label="Source code"
            onSelect={() => sourceEditor.current?.focus?.()}
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
            />
        </Tab>,
        <Tab
            key="context"
            id="context"
            label="Context"
            className={styles.context}
            onSelect={() => contextEditor.current?.focus?.()}
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
                useTextArea
            />
        </Tab>,
        <Tab key="settings" id="settings" label="Scratch settings" className={styles.settingsTab}>
            {scratch.compiler && scratch.compiler_flags && <CompilerOpts
                platform={scratch.platform}
                compiler={scratch.compiler}
                flags={scratch.compiler_flags}
                onCompilerChange={value => setScratch({ compiler: value })}
                onFlagsChange={value => setScratch({ compiler_flags: value })}
            />}
        </Tab>,
    ]
}

export type Props = {
    scratch: api.Scratch
    isSaved?: boolean
    onChange: (s: api.Scratch) => void
    onSave?: () => Promise<unknown>
    onFork?: () => Promise<unknown>
    onClaim?: () => Promise<unknown>
}

export default function Scratch({ scratch, onChange, isSaved, onSave, onFork, onClaim }: Props) {
    const setScratch = (s: Partial<api.Scratch>) => onChange({ ...scratch, ...s })
    const container = useSize<HTMLDivElement>()
    const { compilation, isCompiling, compile } = api.useCompilation(scratch)
    const [leftTab, setLeftTab] = useState("source")
    const [rightTab, setRightTab] = useState("diff")

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
            {scratch.owner ? (
                scratch.owner.is_you && onSave && <AsyncButton
                    disabled={isSaved}
                    primary={!isSaved}
                    errorPlacement="bottom-center"
                    onClick={() => {
                        return Promise.all([
                            onSave(),
                            compile().catch(() => {}), // Ignore errors
                        ])
                    }}
                >
                    <UploadIcon size={16} /> Save
                </AsyncButton>
            ) : (
                onClaim && <AsyncButton
                    primary
                    errorPlacement="bottom-center"
                    onClick={onClaim}
                >
                    Claim as yours
                </AsyncButton>
            )}
            {onFork && <AsyncButton
                primary={!isSaved && !scratch.owner?.is_you}
                errorPlacement="bottom-center"
                onClick={onFork}
            >
                <RepoForkedIcon size={16} /> Fork
            </AsyncButton>}
        </div>

        {(container.width ?? 0) > (LEFT_PANE_MIN_WIDTH + RIGHT_PANE_MIN_WIDTH)
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
                    <Tabs activeTab={rightTab} onChange={setRightTab}>
                        {rightTabs}
                    </Tabs>
                </resizer.Section>
            </resizer.Container>
            : (
                <Tabs activeTab={leftTab} onChange={setLeftTab}>
                    {leftTabs}
                    {rightTabs}
                </Tabs>
            )}
    </div>
}
