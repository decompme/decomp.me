/* eslint css-modules/no-unused-class: off */

import { createContext, CSSProperties, forwardRef, HTMLAttributes, useContext, useEffect, useState } from "react"

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

const SelectedSourceLineContext = createContext<number | null>(null)

function FormatDiffText({ texts }: { texts: api.DiffText[] }) {
    return <> {
        texts.map(t => {
            if (t.format == "rotation") {
                return <span className={styles[`rotation${t.index % 9}`]}>{t.text}</span>
            } else if (t.format) {
                return <span className={styles[t.format]}>{t.text}</span>
            } else {
                return <span>{t.text}</span>
            }
        })
    } </>
}

function DiffCell({ cell, className }: {
    cell: api.DiffCell | undefined
    className?: string
}) {
    const selectedSourceLine = useContext(SelectedSourceLineContext)
    const hasLineNo = typeof cell?.src_line != "undefined"

    if (!cell)
        return <div className={classNames(styles.cell, className)} />

    return <div
        className={classNames(className, {
            [styles.cell]: true,
            [styles.highlight]: hasLineNo && cell.src_line == selectedSourceLine,
        })}
    >
        {hasLineNo && <span className={styles.lineNumber}>{cell.src_line}</span>}
        <FormatDiffText texts={cell.text} />
    </div>
}

function DiffRow({ data, index, style }: {
    data: api.DiffRow[]
    index: number
    style: CSSProperties
}) {
    const row = data[index]

    return <li
        className={styles.row}
        style={{
            ...style,
            top: `${parseFloat(style.top.toString()) + PADDING_TOP}px`,
            lineHeight: `${style.height.toString()}px`,
        }}
    >
        <DiffCell cell={row.base} />
        <DiffCell cell={row.current} />
        <DiffCell cell={row.previous} />
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
    return <div className={styles.bodyContainer}>
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
                    {DiffRow}
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
