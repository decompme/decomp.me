import { useRef } from "react"

import { Compilation, Scratch, useUserIsYou } from "../../lib/api"
import CompilerOpts from "../compiler/CompilerOpts"
import Diff from "../Diff"
import Editor from "../Editor"
import { EditorInstance } from "../Editor/MonacoEditor"
import ScoreBadge from "../ScoreBadge"
import { Tab } from "../Tabs"

import AboutScratch from "./AboutScratch"
import styles from "./renderTabs.module.scss"

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
    SETTINGS,
}

export enum RightScratchTab {
    DIFF,
}

/**
 * Returns the left tabs of the scratch
 * @param {Array<LeftScratchTab>} [filter=undefined] The tabs that you want to filter out
 * @returns Left tabs of scratch
 */
export function useLeftTabs({ scratch, setScratch }: {
    scratch: Scratch
    setScratch: (s: Partial<Scratch>) => void
}, filter?: Array<LeftScratchTab>): React.ReactElement<typeof Tab>[] {
    const sourceEditor = useRef<EditorInstance>()
    const contextEditor = useRef<EditorInstance>()
    const userIsYou = useUserIsYou()

    return renderTabs({
        [LeftScratchTab.SOURCE_CODE]: (
            <Tab
                key="source"
                tabKey="source"
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
            <Tab key="settings" tabKey="settings" label="Scratch settings">
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
 * Returns the right tabs of the scratch
 * @param {Array<RightScratchTab>} [filter=undefined] The tabs that you want to filter out
 * @returns Right tabs of scratch
 */
export function useRightTabs({ compilation }: {
    compilation?: Compilation
}, filter?: Array<RightScratchTab>): React.ReactElement<typeof Tab>[] {
    return renderTabs({
        [RightScratchTab.DIFF]: (
            <Tab
                key="diff"
                tabKey="diff"
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
