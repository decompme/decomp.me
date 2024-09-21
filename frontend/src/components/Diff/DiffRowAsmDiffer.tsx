/* eslint css-modules/no-unused-class: off */

import { CSSProperties, MutableRefObject, memo, useContext } from "react"

import classNames from "classnames"
import { EditorView } from "codemirror"
import memoize from "memoize-one"
import { areEqual } from "react-window"

import * as api from "@/lib/api"

import { ScrollContext } from "../ScrollContext"

import { PADDING_TOP, SelectedSourceLineContext } from "./Diff"
import styles from "./Diff.module.scss"
import { Highlighter } from "./Highlighter"

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
    const editorView = useContext<MutableRefObject<EditorView>>(ScrollContext)
    const hasLineNo = typeof cell?.src_line != "undefined"

    if (!cell)
        return <div className={classNames(styles.cell, className)} />

    const scrollToLineNumber = () => {
        if (!editorView) {
            return
        }

        const lineNumbersEl = editorView.current.dom.querySelectorAll(".cm-gutter.cm-lineNumbers").item(0)
        if (!lineNumbersEl || lineNumbersEl.children.length === 0) {
            return
        }

        // NOTE: Element 0 has textContent of "999" so ignore it
        const firstLineNum = lineNumbersEl.children[1] as HTMLElement
        const lastLineNum = lineNumbersEl.children[lineNumbersEl.children.length - 1] as HTMLElement

        const minLine = parseInt(firstLineNum.textContent)
        const maxLine = parseInt(lastLineNum.textContent)

        const scrollerEl = editorView.current.dom.getElementsByClassName("cm-scroller").item(0)

        if ((minLine <= cell.src_line) && (cell.src_line <= maxLine)) {
            // smoothly scroll to the desired line number
            const lineNumberEl = lineNumbersEl.children[cell.src_line - minLine + 1] as HTMLElement
            scrollerEl.scroll({
                left: lineNumberEl.offsetLeft,
                top: lineNumberEl.offsetTop,
                behavior: "smooth",
            })
        } else {
            // instantly scroll to the start/end and recurse.
            scrollerEl.scroll({
                left: cell.src_line < minLine ? firstLineNum.offsetLeft : lastLineNum.offsetLeft,
                top: cell.src_line < minLine ? firstLineNum.offsetTop : lastLineNum.offsetTop,
                behavior: "instant",
            })
            window.setTimeout(scrollToLineNumber, 0)
        }
    }

    return <div
        className={classNames(styles.cell, className, {
            [styles.highlight]: hasLineNo && cell.src_line == selectedSourceLine,
        })}
    >
        {hasLineNo && <span className={styles.lineNumber}><button onClick={scrollToLineNumber}>{cell.src_line}</button></span>}
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
