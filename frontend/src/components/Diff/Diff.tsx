/* eslint css-modules/no-unused-class: off */

import { createContext, CSSProperties, forwardRef, HTMLAttributes, Fragment, useContext, useEffect, useState } from "react"

import classNames from "classnames"
import AutoSizer from "react-virtualized-auto-sizer"
import { FixedSizeList } from "react-window"

import * as api from "../../lib/api"
import { useSize } from "../../lib/hooks"
import { useDiffFontSize } from "../../lib/settings"
import Loading from "../loading.svg"

import styles from "./Diff.module.scss"
import DragBar from "./DragBar"

const PADDING_TOP = 8
const PADDING_BOTTOM = 8

// Regex for tokenizing lines for click-to-highlight purposes.
// Strings matched by the first regex group (spaces, punctuation)
// are treated as non-highlightable.
const RE_TOKEN = /([ \t,():]+|~>)|%(?:lo|hi)\([^)]+\)|[^ \t,():]+/g

const SelectedSourceLineContext = createContext<number | null>(null)

type Highlighter = {
    value: string | null
    setValue: (value: string | null) => void
    select: (value: string) => void
}

function useHighlighter(setAll: Highlighter["setValue"]): Highlighter {
    const [value, setValue] = useState(null)
    return {
        value,
        setValue,
        select: newValue => {
            // When selecting the same value twice (double-clicking), select it
            // in all diff columns
            if (value === newValue) {
                setAll(newValue)
            } else {
                setValue(newValue)
            }
        },
    }
}

function FormatDiffText({ texts, highlighter }: {
    texts: api.DiffText[]
    highlighter: Highlighter
}) {
    return <> {
        texts.map(t =>
            Array.from(t.text.matchAll(RE_TOKEN)).map((match, index) => {
                const text = match[0]
                const isToken = !match[1]

                let className: string
                if (t.format == "rotation") {
                    className = styles[`rotation${t.index % 9}`]
                } else if (t.format) {
                    className = styles[t.format]
                }

                return <span
                    key={index}
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

function DiffRow({ row, style, highlighter1, highlighter2, highlighter3 }: {
    row: api.DiffRow
    style: CSSProperties
    highlighter1: Highlighter
    highlighter2: Highlighter
    highlighter3: Highlighter
}) {
    return <li
        className={styles.row}
        style={{
            ...style,
            top: `${parseFloat(style.top.toString()) + PADDING_TOP}px`,
            lineHeight: `${style.height.toString()}px`,
        }}
    >
        <DiffCell cell={row.base} highlighter={highlighter1} />
        <DiffCell cell={row.current} highlighter={highlighter2} />
        <DiffCell cell={row.previous} highlighter={highlighter3} />
    </li>
}

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

function DiffBody({ diff, fontSize }: { diff: api.DiffOutput, fontSize: number | undefined }) {
    const setHighlightAll: Highlighter["setValue"] = value => {
        highlighter1.setValue(value)
        highlighter2.setValue(value)
        highlighter3.setValue(value)
    }
    const highlighter1 = useHighlighter(setHighlightAll)
    const highlighter2 = useHighlighter(setHighlightAll)
    const highlighter3 = useHighlighter(setHighlightAll)

    return <div
        className={styles.bodyContainer}
        onClick={() => {
            // If clicks propagate to the container, clear all
            setHighlightAll(null)
        }}
    >
        {diff?.rows && <AutoSizer>
            {({ height, width }) => (
                <FixedSizeList
                    className={styles.body}
                    itemCount={diff.rows.length}
                    itemData={diff.rows}
                    itemSize={(fontSize ?? 12) * 1.33}
                    overscanCount={40}
                    width={width}
                    height={height}
                    innerElementType={innerElementType}
                >
                    {({ data, index, style }) =>
                        <DiffRow
                            row={data[index]}
                            style={style}
                            highlighter1={highlighter1}
                            highlighter2={highlighter2}
                            highlighter3={highlighter3}
                        />
                    }
                </FixedSizeList>
            )}
        </AutoSizer>}
    </div>
}

export type Props = {
    diff: api.DiffOutput
    isCompiling: boolean
    isCurrentOutdated: boolean
    selectedSourceLine: number | null
}

export default function Diff({ diff, isCompiling, isCurrentOutdated, selectedSourceLine }: Props) {
    const [fontSize] = useDiffFontSize()

    const container = useSize<HTMLDivElement>()

    const [barPos, setBarPos] = useState(NaN)
    const [prevBarPos, setPrevBarPos] = useState(NaN)

    const hasPreviousColumn = !!diff?.rows?.[0]?.previous

    const columnMinWidth = 100
    const clampedBarPos = Math.max(columnMinWidth, Math.min(container.width - columnMinWidth - (hasPreviousColumn ? columnMinWidth : 0), barPos))
    const clampedPrevBarPos = hasPreviousColumn ? Math.max(clampedBarPos + columnMinWidth, Math.min(container.width - columnMinWidth, prevBarPos)) : container.width

    useEffect(() => {
        // Initially distribute the bar positions across the container
        if (isNaN(barPos) && container.width) {
            const numSections = hasPreviousColumn ? 3 : 2

            setBarPos(container.width / numSections)
            setPrevBarPos(container.width / numSections * 2)
        }
    }, [barPos, container.width, hasPreviousColumn])

    return <div
        ref={container.ref}
        className={styles.diff}
        style={{
            "--diff-font-size": typeof fontSize == "number" ? `${fontSize}px` : "",
            "--diff-left-width": `${clampedBarPos}px`,
            "--diff-right-width": `${container.width - clampedPrevBarPos}px`,
            "--diff-current-filter": isCurrentOutdated ? "grayscale(25%) brightness(70%)" : "",
        } as CSSProperties}
    >
        <DragBar pos={clampedBarPos} onChange={setBarPos} />
        {hasPreviousColumn && <DragBar pos={clampedPrevBarPos} onChange={setPrevBarPos} />}
        <div className={styles.headers}>
            <div className={styles.header}>
                Target
            </div>
            <div className={styles.header}>
                Current
                {isCompiling && <Loading width={20} height={20} />}
            </div>
            {hasPreviousColumn && <div className={styles.header}>
                Previous
            </div>}
        </div>
        <SelectedSourceLineContext.Provider value={selectedSourceLine}>
            <DiffBody diff={diff} fontSize={fontSize} />
        </SelectedSourceLineContext.Provider>
    </div>
}
