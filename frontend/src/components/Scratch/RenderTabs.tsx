import { useRef } from "react"

import { Compilation, Scratch } from "../../lib/api"
import CompilerOpts from "../compiler/CompilerOpts"
import Diff from "../Diff"
import Editor from "../Editor"
import { EditorInstance } from "../Editor/MonacoEditor"
import ScoreBadge from "../ScoreBadge"
import { Tab } from "../Tabs"

import AboutScratch from "./AboutScratch"
import styles from "./Scratch.module.scss"

type ScratchTab = LeftScratchTab | RightScratchTab

function renderTabs(tabs: {[i: number]: JSX.Element}, filter?: Array<ScratchTab>) {
    if (!filter)
        return Object.values(tabs)
    else
        return Object.keys(tabs).filter(key => filter.includes(+key)).map(key => tabs[key])
}

export enum LeftScratchTab {
    SOURCE_CODE,
    ABOUT,
    CONTEXT,
    SETTINGS,
}

export enum RightScratchTab {
    DIFF,
}

/**
 * Renders the left tabs of the scratch
 * @param {Array<LeftScratchTab>} [filter=undefined] The tabs you want to render
 * @returns Left tabs of scratch
 */
export function renderLeftTabs({ scratch, setScratch }: {
    scratch: Scratch
    setScratch: (s: Partial<Scratch>) => void
}, filter?: Array<LeftScratchTab>): React.ReactElement<typeof Tab>[] {
    const sourceEditor = useRef<EditorInstance>() // eslint-disable-line react-hooks/rules-of-hooks
    const contextEditor = useRef<EditorInstance>() // eslint-disable-line react-hooks/rules-of-hooks

    return renderTabs({
        [LeftScratchTab.SOURCE_CODE]: (
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
            </Tab>
        ),
        [LeftScratchTab.ABOUT]: (
            <Tab key="about" label="About" className={styles.about}>
                <AboutScratch
                    scratch={scratch}
                    setScratch={scratch.owner?.is_you ? setScratch : null}
                />
            </Tab>
        ),
        [LeftScratchTab.CONTEXT]: (
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
            </Tab>
        ),
        [LeftScratchTab.SETTINGS]: (
            <Tab key="settings" label="Scratch settings">
                <CompilerOpts
                    platform={scratch.platform}
                    value={scratch}
                    onChange={setScratch}
                />
            </Tab>
        ),
    }, filter)
}

/**
 * Renders the right tabs of the scratch
 * @param {Array<RightScratchTab>} [filter=undefined] The tabs you want to render
 * @returns Right tabs of scratch
 */
export function renderRightTabs({ compilation }: {
    compilation?: Compilation
}, filter?: Array<RightScratchTab>): React.ReactElement<typeof Tab>[] {
    return renderTabs({
        [RightScratchTab.DIFF]: (
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
            </Tab>
        ),
        /*<Tab key="options" label="Options">
            TODO
        </Tab>,*/
    }, filter)
}
