import { useRef } from "react"

import { EditorView } from "@codemirror/basic-setup"
import { cpp } from "@codemirror/lang-cpp"

import { Compilation, Scratch, useUserIsYou } from "../../lib/api"
import basicSetup from "../../lib/codemirror/basic-setup"
import { useCodeFontSize } from "../../lib/settings"
import CompilerOpts from "../compiler/CompilerOpts"
import CompilationPanel from "../Diff/CompilationPanel"
import CodeMirror from "../Editor/CodeMirror"
import ScoreBadge from "../ScoreBadge"
import { Tab } from "../Tabs"

import AboutScratch from "./AboutScratch"
import styles from "./renderTabs.module.scss"

const CODEMIRROR_EXTENSIONS = [
    basicSetup,
    cpp(),
]

type ScratchTab = LeftScratchTab | RightScratchTab

function renderTabs(tabs: {[i: number]: JSX.Element}, filter?: Array<ScratchTab>) {
    if (!filter)
        return Object.values(tabs)
    else
        return Object.keys(tabs).filter(key => filter.includes(+key)).map(key => tabs[key])
}

export enum LeftScratchTab {
    ABOUT,
    SOURCE_CODE,
    CONTEXT,
    COMPILER_OPTS,
}

export enum RightScratchTab {
    DIFF,
}

/**
 * Returns the left tabs of the scratch
 * @param {Array<LeftScratchTab>} [filter=undefined] The tabs that you want to filter out
 * @returns Left tabs of scratch
 */
export function useLeftTabs({ scratch, setScratch, setSelectedSourceLine }: {
    scratch: Scratch
    setScratch: (s: Partial<Scratch>) => void
    setSelectedSourceLine: (s: number | null) => void
}, filter?: Array<LeftScratchTab>): React.ReactElement<typeof Tab>[] {
    const sourceEditor = useRef<EditorView>()
    const contextEditor = useRef<EditorView>()
    const userIsYou = useUserIsYou()
    const [codeFontSize] = useCodeFontSize()

    return renderTabs({
        [LeftScratchTab.SOURCE_CODE]: (
            <Tab
                key="source"
                tabKey="source"
                label="Source code"
                onSelect={() => sourceEditor.current?.focus?.()}
            >
                <CodeMirror
                    viewRef={sourceEditor}
                    className={styles.editor}
                    value={scratch.source_code}
                    onChange={value => {
                        setScratch({ source_code: value })
                    }}
                    onSelectedLineChange={setSelectedSourceLine}
                    extensions={CODEMIRROR_EXTENSIONS}
                    fontSize={codeFontSize}
                />
            </Tab>
        ),
        [LeftScratchTab.ABOUT]: (
            <Tab key="about" tabKey="about" label="About" className={styles.about}>
                <AboutScratch
                    scratch={scratch}
                    setScratch={userIsYou(scratch.owner) ? setScratch : null}
                />
            </Tab>
        ),
        [LeftScratchTab.CONTEXT]: (
            <Tab
                key="context"
                tabKey="context"
                label="Context"
                className={styles.context}
                onSelect={() => contextEditor.current?.focus?.()}
            >
                <CodeMirror
                    viewRef={contextEditor}
                    className={styles.editor}
                    value={scratch.context}
                    onChange={value => {
                        setScratch({ context: value })
                    }}
                    extensions={CODEMIRROR_EXTENSIONS}
                    fontSize={codeFontSize}
                />
            </Tab>
        ),
        [LeftScratchTab.COMPILER_OPTS]: (
            <Tab key="compiler_opts" tabKey="compiler_opts" label="Scratch options" className={styles.compilerOptsTab}>
                <div className={styles.compilerOptsContainer}>
                    <CompilerOpts
                        platform={scratch.platform}
                        value={scratch}
                        onChange={setScratch}

                        diffLabel={scratch.diff_label}
                        onDiffLabelChange={d => setScratch({ diff_label: d })}
                    />
                </div>
            </Tab>
        ),
    }, filter)
}

/**
 * Returns the right tabs of the scratch
 * @param {Array<RightScratchTab>} [filter=undefined] The tabs that you want to filter out
 * @returns Right tabs of scratch
 */
export function useRightTabs({ compilation, isCompiling, isCompilationOld, selectedSourceLine }: {
    compilation?: Compilation
    isCompiling: boolean
    isCompilationOld: boolean
    selectedSourceLine: number | null
}, filter?: Array<RightScratchTab>): React.ReactElement<typeof Tab>[] {
    return renderTabs({
        [RightScratchTab.DIFF]: (
            <Tab
                key="diff"
                tabKey="diff"
                label={<>
                    Compilation
                    {compilation && <ScoreBadge
                        score={compilation?.diff_output?.current_score ?? -1}
                        maxScore={compilation?.diff_output?.max_score ?? -1} />}
                </>}
                className={styles.diffTab}
            >
                {compilation && <CompilationPanel
                    compilation={compilation}
                    isCompiling={isCompiling}
                    isCompilationOld={isCompilationOld}
                    selectedSourceLine={selectedSourceLine}
                />}
            </Tab>
        ),
        /*<Tab key="options" label="Options">
            TODO
        </Tab>,*/
    }, filter)
}
