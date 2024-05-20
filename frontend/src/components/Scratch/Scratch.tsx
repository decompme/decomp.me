import { useEffect, useReducer, useRef, useState } from "react"

import { EditorView } from "@codemirror/view"
import { vim } from "@replit/codemirror-vim"

import * as api from "@/lib/api"
import basicSetup from "@/lib/codemirror/basic-setup"
import { cpp } from "@/lib/codemirror/cpp"
import useCompareExtension from "@/lib/codemirror/useCompareExtension"
import { useSize } from "@/lib/hooks"
import { useAutoRecompileSetting, useAutoRecompileDelaySetting, useLanguageServerEnabled, useVimModeEnabled, useMatchProgressBarEnabled } from "@/lib/settings"

import CompilerOpts from "../compiler/CompilerOpts"
import CustomLayout, { activateTabInLayout, Layout } from "../CustomLayout"
import CompilationPanel from "../Diff/CompilationPanel"
import CodeMirror from "../Editor/CodeMirror"
import ErrorBoundary from "../ErrorBoundary"
import ScoreBadge, { calculateScorePercent } from "../ScoreBadge"
import { Tab, TabCloseButton } from "../Tabs"

import AboutScratch from "./AboutScratch"
import CommentsPanel from "./CommentsPanel"
import DecompilationPanel from "./DecompilePanel"
import FamilyPanel from "./FamilyPanel"
import useLanguageServer from "./hooks/useLanguageServer"
import styles from "./Scratch.module.scss"
import ScratchMatchBanner from "./ScratchMatchBanner"
import ScratchProgressBar from "./ScratchProgressBar"
import ScratchToolbar from "./ScratchToolbar"

enum TabId {
    ABOUT = "scratch_about",
    SOURCE_CODE = "scratch_source_code",
    CONTEXT = "scratch_context",
    OPTIONS = "scratch_options",
    DIFF = "scratch_diff",
    DECOMPILATION = "scratch_decompilation",
    FAMILY = "scratch_family",
    COMMENTS = "scratch_comments",
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
                    TabId.COMMENTS,
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
    offline: boolean
}

export default function Scratch({
    scratch,
    onChange,
    parentScratch,
    initialCompilation,
    offline,
}: Props) {
    const container = useSize<HTMLDivElement>()
    const [layout, setLayout] = useState<Layout>(undefined)
    const [layoutName, setLayoutName] = useState<keyof typeof DEFAULT_LAYOUTS>(undefined)

    const [autoRecompileSetting] = useAutoRecompileSetting()
    const [autoRecompileDelaySetting] = useAutoRecompileDelaySetting()
    const [languageServerEnabledSetting] = useLanguageServerEnabled()
    const [matchProgressBarEnabledSetting] = useMatchProgressBarEnabled()
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
    const [perSaveObj, setPerSaveObj] = useState({})
    const saveCallback = () => {
        setPerSaveObj({})
    }

    const shouldCompare = !isModified
    const sourceCompareExtension = useCompareExtension(sourceEditor, shouldCompare ? parentScratch?.source_code : undefined)
    const contextCompareExtension = useCompareExtension(contextEditor, shouldCompare ? parentScratch?.context : undefined)

    const [saveSource, saveContext] = useLanguageServer(languageServerEnabledSetting, scratch, sourceEditor, contextEditor)

    const lastGoodScore = useRef<number>(scratch.score)
    const lastGoodMaxScore = useRef<number>(scratch.max_score)
    if (compilation?.success) {
        lastGoodScore.current = compilation?.diff_output?.current_score
        lastGoodMaxScore.current = compilation?.diff_output?.max_score
    }

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

    // If the version of the scratch changes, refresh code editors
    useEffect(() => {
        incrementValueVersion()
    }, [scratch.slug, scratch.last_updated])

    const [useVim] = useVimModeEnabled()
    const cmExtensionsSource = [...CODEMIRROR_EXTENSIONS, sourceCompareExtension]
    const cmExtensionsContext = [...CODEMIRROR_EXTENSIONS, contextCompareExtension]
    if (useVim) {
        cmExtensionsSource.push(vim())
        cmExtensionsContext.push(vim())
    }

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
                onSelect={() => {
                    sourceEditor.current?.focus?.()
                    saveContext()
                }}
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
                    extensions={cmExtensionsSource}
                />
            </Tab>
        case TabId.CONTEXT:
            return <Tab
                key={id}
                tabKey={id}
                label="Context"
                className={styles.context}
                onSelect={() => {
                    contextEditor.current?.focus?.()
                    saveSource()
                }}
            >
                <CodeMirror
                    viewRef={contextEditor}
                    className={styles.editor}
                    value={scratch.context}
                    valueVersion={valueVersion}
                    onChange={value => {
                        setScratch({ context: value })
                    }}
                    extensions={cmExtensionsContext}
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

                        matchOverride={scratch.match_override}
                        onMatchOverrideChange={m => setScratch({ match_override: m })}
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
                        maxScore={compilation?.diff_output?.max_score ?? -1}
                        matchOverride={scratch.match_override}
                        compiledSuccessfully={compilation?.success ?? false} />}
                </>}
                className={styles.diffTab}
            >
                {compilation && <CompilationPanel
                    compilation={compilation}
                    isCompiling={isCompiling}
                    isCompilationOld={isCompilationOld}
                    selectedSourceLine={selectedSourceLine}
                    perSaveObj={perSaveObj}
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
        case TabId.COMMENTS:
            return <Tab key={id} tabKey={id} label="Comments">
                {() => <CommentsPanel scratch={scratch} />}
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

    const offlineOverlay = (
        offline ? <>
            <div className="fixed top-10 self-center rounded bg-red-8 px-3 py-2">
                <p className="text-sm">The scratch editor is in offline mode. We're attempting to reconnect to the backend – as long as this tab is open, your work is safe.</p>
            </div>
        </>
            : <></>
    )

    const matchPercent = calculateScorePercent(lastGoodScore.current, lastGoodMaxScore.current)

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
                saveCallback={saveCallback}
                setDecompilationTabEnabled={setDecompilationTabEnabled}
            />
            {matchProgressBarEnabledSetting && <div className={styles.progressbar}><ScratchProgressBar matchPercent={matchPercent}/></div>}
        </ErrorBoundary>
        <ErrorBoundary>
            {layout && <CustomLayout
                layout={layout}
                onChange={setLayout}
                renderTab={renderTab}
            />}
        </ErrorBoundary>
        {offlineOverlay}
    </div>
}
