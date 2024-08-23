/* eslint css-modules/no-unused-class: off */

import { createContext, CSSProperties, forwardRef, HTMLAttributes, memo, useContext, useRef, useState } from "react"

import { VersionsIcon } from "@primer/octicons-react"
import classNames from "classnames"
import memoize from "memoize-one"
import AutoSizer from "react-virtualized-auto-sizer"
import { FixedSizeList, areEqual } from "react-window"

import * as api from "@/lib/api"
import { useSize } from "@/lib/hooks"
import { ThreeWayDiffBase, useCodeFontSize } from "@/lib/settings"

import Loading from "../loading.svg"

import styles from "./Diff.module.scss"
import DragBar from "./DragBar"
import { Highlighter, useHighlighers } from "./Highlighter"

const PADDING_TOP = 8
const PADDING_BOTTOM = 8

// Regex for tokenizing lines for click-to-highlight purposes.
// Strings matched by the first regex group (spaces, punctuation)
// are treated as non-highlightable.
const RE_TOKEN = /([ \t,()[\]:]+|~>)|%(?:lo|hi)\([^)]+\)|[^ \t,()[\]:]+/g

const SelectedSourceLineContext = createContext<number | null>(null)

function FormatDiffText({ texts, highlighter }: {
    texts: api.DiffText[]
    highlighter: Highlighter
}) {
    return <> {
        texts.map((t, index1) =>
            Array.from(t.text.matchAll(RE_TOKEN)).map((match, index2) => {
                const text = match[0]
                const isToken = !match[1]
                const key = index1 + "," + index2

                let className: string
                if (t.format == "rotation") {
                    className = styles[`rotation${t.index % 9}`]
                } else if (t.format) {
                    className = styles[t.format]
                }

                return <span
                    key={key}
                    className={classNames(className, {
                        [styles.highlightable]: isToken,
                        [styles.highlighted]: (highlighter.value === text),
                    })}
                    onClick={e => {
                        if (isToken) {
                            highlighter.select(text)
                            e.stopPropagation()
                        }
                    }}
                >
                    {text}
                </span>
            })
        )
    }</>
}

function DiffCell({ cell, className, highlighter }: {
    cell: api.DiffCell | undefined
    className?: string
    highlighter: Highlighter
}) {
    const selectedSourceLine = useContext(SelectedSourceLineContext)
    const hasLineNo = typeof cell?.src_line != "undefined"

    if (!cell)
        return <div className={classNames(styles.cell, className)} />

    return <div
        className={classNames(styles.cell, className, {
            [styles.highlight]: hasLineNo && cell.src_line == selectedSourceLine,
        })}
    >
        {hasLineNo && <span className={styles.lineNumber}>{cell.src_line}</span>}
        <FormatDiffText texts={cell.text} highlighter={highlighter} />
    </div>
}

const DiffRow = memo(function DiffRow({ data, index, style }: { data: DiffListData, index: number, style: CSSProperties }) {
    const row = data.diff?.rows?.[index]
    return <li
        className={styles.row}
        style={{
            ...style,
            top: `${parseFloat(style.top.toString()) + PADDING_TOP}px`,
            lineHeight: `${style.height.toString()}px`,
        }}
    >
        <DiffCell cell={row.base} highlighter={data.highlighters[0]} />
        <DiffCell cell={row.current} highlighter={data.highlighters[1]} />
        <DiffCell cell={row.previous} highlighter={data.highlighters[2]} />
    </li>
}, areEqual)

// https://github.com/bvaughn/react-window#can-i-add-padding-to-the-top-and-bottom-of-a-list
const innerElementType = forwardRef<HTMLUListElement, HTMLAttributes<HTMLUListElement>>(({ style, ...rest }, ref) => {
    return <ul
        ref={ref}
        style={{
            ...style,
            height: `${parseFloat(style.height.toString()) + PADDING_TOP + PADDING_BOTTOM}px`,
        }}
        {...rest}
    />
})
innerElementType.displayName = "innerElementType"

interface DiffListData {
    diff: api.DiffOutput | null
    highlighters: Highlighter[]
}

const createDiffListData = memoize((
    diff: api.DiffOutput | null,
    highlighters: Highlighter[]
): DiffListData => {
    return { diff, highlighters }
})

function DiffBody({ diff, fontSize }: { diff: api.DiffOutput | null, fontSize: number | undefined }) {
    const { highlighters, setHighlightAll } = useHighlighers(3)
    const itemData = createDiffListData(diff, highlighters)

    return <div
        className={styles.bodyContainer}
        onClick={() => {
            // If clicks propagate to the container, clear all
            setHighlightAll(null)
        }}
    >
        {diff?.rows && <AutoSizer>
            {({ height, width }: {height: number|undefined, width:number|undefined}) => (
                <FixedSizeList
                    className={styles.body}
                    itemCount={diff.rows.length}
                    itemData={itemData}
                    itemSize={(fontSize ?? 12) * 1.33}
                    overscanCount={40}
                    width={width}
                    height={height}
                    innerElementType={innerElementType}
                >
                    {DiffRow}
                </FixedSizeList>
            )}
        </AutoSizer>}
    </div>
}

function ThreeWayToggleButton({ enabled, setEnabled }: { enabled: boolean, setEnabled: (enabled: boolean) => void }) {
    return <button
        className={styles.threeWayToggle}
        onClick={() => {
            setEnabled(!enabled)
        }}
        title={enabled ? "Disable three-way diffing" : "Enable three-way diffing"}
    >
        <VersionsIcon size={24} />
        <div className={styles.threeWayToggleNumber}>
            {enabled ? "3" : "2"}
        </div>
    </button>
}

export type Props = {
    diff: api.DiffOutput | null
    isCompiling: boolean
    isCurrentOutdated: boolean
    threeWayDiffEnabled: boolean
    setThreeWayDiffEnabled: (value: boolean) => void
    threeWayDiffBase: ThreeWayDiffBase
    selectedSourceLine: number | null
}

export default function Diff({ diff, isCompiling, isCurrentOutdated, threeWayDiffEnabled, setThreeWayDiffEnabled, threeWayDiffBase, selectedSourceLine }: Props) {
    const [fontSize] = useCodeFontSize()

    const container = useSize<HTMLDivElement>()

    const [bar1Pos, setBar1Pos] = useState(NaN)
    const [bar2Pos, setBar2Pos] = useState(NaN)

    const columnMinWidth = 100
    const clampedBar1Pos = Math.max(columnMinWidth, Math.min(container.width - columnMinWidth - (threeWayDiffEnabled ? columnMinWidth : 0), bar1Pos))
    const clampedBar2Pos = threeWayDiffEnabled ? Math.max(clampedBar1Pos + columnMinWidth, Math.min(container.width - columnMinWidth, bar2Pos)) : container.width

    // Distribute the bar positions across the container when its width changes
    const updateBarPositions = (threeWayDiffEnabled: boolean) => {
        const numSections = threeWayDiffEnabled ? 3 : 2
        setBar1Pos(container.width / numSections)
        setBar2Pos(container.width / numSections * 2)
    }
    const lastContainerWidthRef = useRef(NaN)
    if (lastContainerWidthRef.current !== container.width && container.width) {
        lastContainerWidthRef.current = container.width
        updateBarPositions(threeWayDiffEnabled)
    }

    const threeWayButton = <>
        <div className={styles.spacer} />
        <ThreeWayToggleButton
            enabled={threeWayDiffEnabled}
            setEnabled={(enabled: boolean) => {
                updateBarPositions(enabled)
                setThreeWayDiffEnabled(enabled)
            }}
        />
    </>

    return <div
        ref={container.ref}
        className={styles.diff}
        style={{
            "--diff-font-size": typeof fontSize == "number" ? `${fontSize}px` : "",
            "--diff-left-width": `${clampedBar1Pos}px`,
            "--diff-right-width": `${container.width - clampedBar2Pos}px`,
            "--diff-current-filter": isCurrentOutdated ? "grayscale(25%) brightness(70%)" : "",
        } as CSSProperties}
    >
        <DragBar pos={clampedBar1Pos} onChange={setBar1Pos} />
        {threeWayDiffEnabled && <DragBar pos={clampedBar2Pos} onChange={setBar2Pos} />}
        <div className={styles.headers}>
            <div className={styles.header}>
                Target
            </div>
            <div className={styles.header}>
                Current
                {isCompiling && <Loading width={20} height={20} />}
                {!threeWayDiffEnabled && threeWayButton}
            </div>
            {threeWayDiffEnabled && <div className={styles.header}>
                {threeWayDiffBase === ThreeWayDiffBase.SAVED ? "Saved" : "Previous"}
                {threeWayButton}
            </div>}
        </div>
        <SelectedSourceLineContext.Provider value={selectedSourceLine}>
            <DiffBody diff={diff} fontSize={fontSize} />
        </SelectedSourceLineContext.Provider>
    </div>
}
