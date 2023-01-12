import { useEffect, useReducer, useRef, useState } from "react"

import { cpp } from "@codemirror/lang-cpp"
import { EditorView } from "@codemirror/view"

import * as api from "@/lib/api"
import basicSetup from "@/lib/codemirror/basic-setup"
import useCompareExtension from "@/lib/codemirror/useCompareExtension"
import { useSize } from "@/lib/hooks"
import { useAutoRecompileSetting, useAutoRecompileDelaySetting } from "@/lib/settings"

import CompilerOpts from "../compiler/CompilerOpts"
import CustomLayout, { activateTabInLayout, Layout } from "../CustomLayout"
import CompilationPanel from "../Diff/CompilationPanel"
import CodeMirror from "../Editor/CodeMirror"
import ErrorBoundary from "../ErrorBoundary"
import ScoreBadge from "../ScoreBadge"
import { Tab, TabCloseButton } from "../Tabs"

import AboutScratch from "./AboutScratch"
import DecompilationPanel from "./DecompilePanel"
import FamilyPanel from "./FamilyPanel"
import styles from "./Scratch.module.scss"
import ScratchMatchBanner from "./ScratchMatchBanner"
import ScratchToolbar from "./ScratchToolbar"

enum TabId {
    ABOUT = "scratch_about",
    SOURCE_CODE = "scratch_source_code",
    CONTEXT = "scratch_context",
    OPTIONS = "scratch_options",
    DIFF = "scratch_diff",
    DECOMPILATION = "scratch_decompilation",
    FAMILY = "scratch_family",
}

const DEFAULT_LAYOUTS: Record<"desktop_2col" | "mobile_2row", Layout> = {
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
                    TabId.FAMILY,
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
                    TabId.DECOMPILATION,
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
                    TabId.FAMILY,
                    TabId.DIFF,
                    TabId.DECOMPILATION,
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
}

const CODEMIRROR_EXTENSIONS = [
    basicSetup,
    cpp(),
]

function getDefaultLayout(width: number, _height: number): keyof typeof DEFAULT_LAYOUTS {
    if (width > 700) {
        return "desktop_2col"
    }

    return "mobile_2row"
}

export type Props = {
    scratch: Readonly<api.Scratch>
    onChange: (scratch: Partial<api.Scratch>) => void
    parentScratch?: api.Scratch
    initialCompilation?: Readonly<api.Compilation>
}

export default function Scratch({
    scratch,
    onChange,
    parentScratch,
    initialCompilation,
}: Props) {
    const container = useSize<HTMLDivElement>()
    const [layout, setLayout] = useState<Layout>(undefined)
    const [layoutName, setLayoutName] = useState<keyof typeof DEFAULT_LAYOUTS>(undefined)

    const [autoRecompileSetting] = useAutoRecompileSetting()
    const [autoRecompileDelaySetting] = useAutoRecompileDelaySetting()
    const { compilation, isCompiling, isCompilationOld, compile } = api.useCompilation(scratch, autoRecompileSetting, autoRecompileDelaySetting, initialCompilation)
    const userIsYou = api.useUserIsYou()
    const [selectedSourceLine, setSelectedSourceLine] = useState<number | null>()
    const sourceEditor = useRef<EditorView>()
    const contextEditor = useRef<EditorView>()
    const [valueVersion, incrementValueVersion] = useReducer(x => x + 1, 0)

    const [isModified, setIsModified] = useState(false)
    const setScratch = (scratch: Partial<api.Scratch>) => {
        onChange(scratch)
        setIsModified(true)
    }

    const shouldCompare = !isModified
    const sourceCompareExtension = useCompareExtension(sourceEditor, shouldCompare ? parentScratch?.source_code : undefined)
    const contextCompareExtension = useCompareExtension(contextEditor, shouldCompare ? parentScratch?.context : undefined)

    // TODO: CustomLayout should handle adding/removing tabs
    const [decompilationTabEnabled, setDecompilationTabEnabled] = useState(false)
    useEffect(() => {
        if (decompilationTabEnabled) {
            setLayout(layout => {
                const clone = { ...layout }
                activateTabInLayout(clone, TabId.DECOMPILATION)
                return clone
            })
        }
    }, [decompilationTabEnabled])

    // If the slug changes, refresh code editors
    useEffect(() => {
        incrementValueVersion()
    }, [scratch.slug])

    const renderTab = (id: string) => {
        switch (id as TabId) {
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
                    extensions={[...CODEMIRROR_EXTENSIONS, sourceCompareExtension]}
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
                    extensions={[...CODEMIRROR_EXTENSIONS, contextCompareExtension]}
                />
            </Tab>
        case TabId.OPTIONS:
            return <Tab key={id} tabKey={id} label="Options" className={styles.compilerOptsTab}>
                {() => <div className={styles.compilerOptsContainer}>
                    <CompilerOpts
                        platform={scratch.platform}
                        value={scratch}
                        onChange={setScratch}

                        diffLabel={scratch.diff_label}
                        onDiffLabelChange={d => setScratch({ diff_label: d })}
                    />
                </div>}
            </Tab>
        case TabId.DIFF:
            return <Tab
                key={id}
                tabKey={id}
                label={<>
                    Compilation
                    {compilation && <ScoreBadge
                        score={compilation?.diff_output?.current_score ?? -1}
                        maxScore={compilation?.diff_output?.max_score ?? -1}
                        compiledSuccessfully={compilation?.success ?? false} />}
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
        case TabId.DECOMPILATION:
            return decompilationTabEnabled && <Tab
                key={id}
                tabKey={id}
                label={<>
                    Decompilation
                    <TabCloseButton onClick={() => setDecompilationTabEnabled(false)} />
                </>}
            >
                {() => <DecompilationPanel scratch={scratch} />}
            </Tab>
        case TabId.FAMILY:
            return <Tab key={id} tabKey={id} label="Family">
                {() => <FamilyPanel scratch={scratch} />}
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
        <ErrorBoundary>
            <ScratchToolbar
                compile={compile}
                isCompiling={isCompiling}
                scratch={scratch}
                setScratch={setScratch}
                setDecompilationTabEnabled={setDecompilationTabEnabled}
            />
        </ErrorBoundary>
        <ErrorBoundary>
            {layout && <CustomLayout
                layout={layout}
                onChange={setLayout}
                renderTab={renderTab}
            />}
        </ErrorBoundary>
    </div>
}
