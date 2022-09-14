import { useEffect, useReducer, useRef, useState } from "react"

import { EditorView } from "@codemirror/basic-setup"
import { cpp } from "@codemirror/lang-cpp"

import * as api from "../../lib/api"
import basicSetup from "../../lib/codemirror/basic-setup"
import { useSize } from "../../lib/hooks"
import { useAutoRecompileSetting, useAutoRecompileDelaySetting } from "../../lib/settings"
import CompilerOpts from "../compiler/CompilerOpts"
import CustomLayout from "../CustomLayout"
import CompilationPanel from "../Diff/CompilationPanel"
import CodeMirror from "../Editor/CodeMirror"
import ErrorBoundary from "../ErrorBoundary"
import ScoreBadge from "../ScoreBadge"
import { Tab } from "../Tabs"

import AboutScratch from "./AboutScratch"
import styles from "./Scratch.module.scss"
import ScratchMatchBanner from "./ScratchMatchBanner"
import ScratchToolbar from "./ScratchToolbar"

enum TabId {
    ABOUT = "scratch_about",
    SOURCE_CODE = "scratch_source_code",
    CONTEXT = "scratch_context",
    OPTIONS = "scratch_options",
    DIFF = "scratch_diff",
}

const DEFAULT_LAYOUTS = {
    desktop_2col: {
        key: 0,
        kind: "horizontal",
        size: 100,
        children: [
            {
                key: 1,
                kind: "pane",
                size: 50,
                activeTab: TabId.SOURCE_CODE,
                tabs: [
                    TabId.ABOUT,
                    TabId.SOURCE_CODE,
                    TabId.CONTEXT,
                    TabId.OPTIONS,
                ],
            },
            {
                key: 2,
                kind: "pane",
                size: 50,
                activeTab: TabId.DIFF,
                tabs: [
                    TabId.DIFF,
                ],
            },
        ],
    },
    mobile_2row: {
        key: 0,
        kind: "vertical",
        size: 100,
        children: [
            {
                key: 1,
                kind: "pane",
                size: 50,
                activeTab: TabId.DIFF,
                tabs: [
                    TabId.ABOUT,
                    TabId.DIFF,
                ],
            },
            {
                key: 2,
                kind: "pane",
                size: 50,
                activeTab: TabId.SOURCE_CODE,
                tabs: [
                    TabId.SOURCE_CODE,
                    TabId.CONTEXT,
                    TabId.OPTIONS,
                ],
            },
        ],
    },
    compact: {
        key: 0,
        kind: "pane",
        size: 100,
        activeTab: TabId.DIFF,
        tabs: [
            TabId.ABOUT,
            TabId.SOURCE_CODE,
            TabId.CONTEXT,
            TabId.DIFF,
            TabId.OPTIONS,
        ],
    },
}

const CODEMIRROR_EXTENSIONS = [
    basicSetup,
    cpp(),
]

function getDefaultLayout(width: number, height: number): keyof typeof DEFAULT_LAYOUTS {
    if (width > 700) {
        return "desktop_2col"
    }

    if (height > 500) {
        return "mobile_2row"
    }

    return "compact"
}

export type Props = {
    scratch: Readonly<api.Scratch>
    onChange: (scratch: Partial<api.Scratch>) => void
    initialCompilation?: Readonly<api.Compilation>
}

export default function Scratch({
    scratch,
    onChange: setScratch,
    initialCompilation,
}: Props) {
    const container = useSize<HTMLDivElement>()
    const [layout, setLayout] = useState(undefined)
    const [layoutName, setLayoutName] = useState<keyof typeof DEFAULT_LAYOUTS>(undefined)

    const [autoRecompileSetting] = useAutoRecompileSetting()
    const [autoRecompileDelaySetting] = useAutoRecompileDelaySetting()
    const { compilation, isCompiling, isCompilationOld, compile } = api.useCompilation(scratch, autoRecompileSetting, autoRecompileDelaySetting, initialCompilation)
    const userIsYou = api.useUserIsYou()
    const [selectedSourceLine, setSelectedSourceLine] = useState<number | null>()
    const sourceEditor = useRef<EditorView>()
    const contextEditor = useRef<EditorView>()
    const [valueVersion, incrementValueVersion] = useReducer(x => x + 1, 0)

    // If the slug changes, refresh code editors
    useEffect(() => {
        incrementValueVersion()
    }, [scratch.slug])

    const renderTab = (id: string) => {
        switch (id) {
        case TabId.ABOUT:
            return <Tab key={id} tabKey={id} label="About" className={styles.about}>
                <AboutScratch
                    scratch={scratch}
                    setScratch={userIsYou(scratch.owner) ? setScratch : null}
                />
            </Tab>
        case TabId.SOURCE_CODE:
            return <Tab
                key={id}
                tabKey={id}
                label="Source code"
                onSelect={() => sourceEditor.current?.focus?.()}
            >
                <CodeMirror
                    viewRef={sourceEditor}
                    className={styles.editor}
                    value={scratch.source_code}
                    valueVersion={valueVersion}
                    onChange={value => {
                        setScratch({ source_code: value })
                    }}
                    onSelectedLineChange={setSelectedSourceLine}
                    extensions={CODEMIRROR_EXTENSIONS}
                />
            </Tab>
        case TabId.CONTEXT:
            return <Tab
                key={id}
                tabKey={id}
                label="Context"
                className={styles.context}
                onSelect={() => contextEditor.current?.focus?.()}
            >
                <CodeMirror
                    viewRef={contextEditor}
                    className={styles.editor}
                    value={scratch.context}
                    valueVersion={valueVersion}
                    onChange={value => {
                        setScratch({ context: value })
                    }}
                    extensions={CODEMIRROR_EXTENSIONS}
                />
            </Tab>
        case TabId.OPTIONS:
            return <Tab key={id} tabKey={id} label="Options" className={styles.compilerOptsTab}>
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
        case TabId.DIFF:
            return <Tab
                key={id}
                tabKey={id}
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
        default:
            return <Tab key={id} tabKey={id} label={id} disabled />
        }
    }

    if (container.width) {
        const preferredLayout = getDefaultLayout(container.width, container.height)

        if (layoutName != preferredLayout) {
            setLayoutName(preferredLayout)
            setLayout(DEFAULT_LAYOUTS[preferredLayout])
        }
    }

    return <div ref={container.ref} className={styles.container}>
        <ErrorBoundary>
            <ScratchMatchBanner scratch={scratch} />
        </ErrorBoundary>
        <ScratchToolbar
            compile={compile}
            isCompiling={isCompiling}
            scratch={scratch}
            setScratch={setScratch}
            incrementValueVersion={incrementValueVersion}
        />
        <hr />
        {layout && <CustomLayout
            layout={layout}
            onChange={setLayout}
            renderTab={renderTab}
        />}
    </div>
}
