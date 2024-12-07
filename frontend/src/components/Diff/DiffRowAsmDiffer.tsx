/* eslint css-modules/no-unused-class: off */

import { type CSSProperties, type MutableRefObject, memo, useContext } from "react"

import classNames from "classnames"
import type { EditorView } from "codemirror"
import memoize from "memoize-one"
import { areEqual } from "react-window"

import type * as api from "@/lib/api"

import { ScrollContext } from "../ScrollContext"

import { PADDING_TOP, SelectedSourceLineContext, scrollToLineNumber } from "./Diff"
import styles from "./Diff.module.scss"
import type { Highlighter } from "./Highlighter"

// Regex for tokenizing lines for click-to-highlight purposes.
// Strings matched by the first regex group (spaces, punctuation)
// are treated as non-highlightable.
const RE_TOKEN = /([ \t,()[\]:]+|~>)|%(?:lo|hi)\([^)]+\)|[^ \t,()[\]:]+/g

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
    const sourceEditor = useContext<MutableRefObject<EditorView>>(ScrollContext)
    const hasLineNo = typeof cell?.src_line != "undefined"

    if (!cell)
        return <div className={classNames(styles.cell, className)} />

    return <div
        className={classNames(styles.cell, className, {
            [styles.highlight]: hasLineNo && cell.src_line == selectedSourceLine,
        })}
    >
        {hasLineNo && <span className={styles.lineNumber}><button onClick={() => scrollToLineNumber(sourceEditor, cell.src_line)}>{cell.src_line}</button></span>}
        <FormatDiffText texts={cell.text} highlighter={highlighter} />
    </div>
}

export type DiffListData = {
    diff: api.DiffOutput | null
    itemCount: number
    highlighters: Highlighter[]
}

export const createDiffListData = memoize((
    diff: api.DiffOutput | null,
    _diffLabel: string,
    highlighters: Highlighter[]
): DiffListData => {
    return { diff, highlighters, itemCount: diff?.rows?.length ?? 0 }
})

export const DiffRow = memo(function DiffRow({ data, index, style }: { data: DiffListData, index: number, style: CSSProperties }) {
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
