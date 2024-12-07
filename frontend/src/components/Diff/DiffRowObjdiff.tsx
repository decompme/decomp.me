/* eslint css-modules/no-unused-class: off */

import { type CSSProperties, type MutableRefObject, memo, useContext } from "react"

import classNames from "classnames"
import type { EditorView } from "codemirror"
import memoize from "memoize-one"
import { DiffKind, type DiffResult, type FunctionDiff, type InstructionDiff, type ObjectDiff, displayDiff, oneof } from "objdiff-wasm"
import { areEqual } from "react-window"

import { ScrollContext } from "../ScrollContext"

import { PADDING_TOP, SelectedSourceLineContext, scrollToLineNumber } from "./Diff"
import styles from "./Diff.module.scss"
import type { Highlighter } from "./Highlighter"

function FormatDiffText({ insDiff, baseAddress, highlighter }: {
    insDiff: InstructionDiff
    baseAddress?: bigint
    highlighter?: Highlighter
}) {
    const out: JSX.Element[] = []
    let index = 0
    displayDiff(insDiff, baseAddress || BigInt(0), t => {
        let className: string | null = null
        if (t.diff_index != null) {
            className = styles[`rotation${t.diff_index % 9}`]
        }
        let text = ""
        let postText = "" // unhighlightable text after the token
        let padTo = 0
        let isToken = false
        switch (t.type) {
        case "basic":
            text = t.text
            break
        case "basic_color":
            text = t.text
            className = styles[`rotation${t.index % 9}`]
            break
        case "line":
            text = (t.line_number || 0).toString(16)
            padTo = 5
            break
        case "address":
            text = (t.address || 0).toString(16)
            postText = ":"
            padTo = 5
            isToken = true
            break
        case "opcode":
            text = t.mnemonic
            padTo = 8
            isToken = true
            if (insDiff.diff_kind == DiffKind.DIFF_OP_MISMATCH) {
                className = styles.diff_change
            }
            break
        case "argument": {
            const value = oneof(t.value.value)
            switch (value.oneofKind) {
            case "signed":
                if (value.signed < 0) {
                    text = `-0x${(-value.signed).toString(16)}`
                } else {
                    text = `0x${value.signed.toString(16)}`
                }
                break
            case "unsigned":
                text = `0x${value.unsigned.toString(16)}`
                break
            case "opaque":
                text = value.opaque
                break
            }
            isToken = true
            break
        }
        case "branch_dest":
            text = (t.address || 0).toString(16)
            isToken = true
            break
        case "symbol":
            text = t.target.symbol.demangled_name || t.target.symbol.name
            className = styles.symbol
            isToken = true
            break
        case "spacing":
            text = " ".repeat(t.count)
            break
        default:
            console.warn("Unknown text type", t)
            return null
        }
        out.push(<span
            key={index}
            className={classNames(className, {
                [styles.highlightable]: isToken,
                [styles.highlighted]: (highlighter?.value === text),
            })}
            onClick={e => {
                if (isToken) {
                    highlighter?.select(text)
                    e.stopPropagation()
                }
            }}
        >{text}</span>)
        index++
        if (postText) {
            out.push(<span key={index}>{postText}</span>)
            index++
        }
        if (padTo > text.length + postText.length) {
            const spacing = " ".repeat(padTo - text.length - postText.length)
            out.push(<span key={index}>{spacing}</span>)
            index++
        }
    })
    return out
}

function DiffCell({ cell, baseAddress, className, highlighter }: {
    cell: InstructionDiff | undefined
    baseAddress: bigint | undefined
    className?: string
    highlighter?: Highlighter
}) {
    const selectedSourceLine = useContext(SelectedSourceLineContext)
    const sourceEditor = useContext<MutableRefObject<EditorView>>(ScrollContext)
    const hasLineNo = typeof cell?.instruction?.line_number != "undefined"

    if (!cell)
        return <div className={classNames(styles.cell, className)} />

    const classes = []
    if (cell?.diff_kind) {
        classes.push(styles.diff_any)
    }
    switch (cell?.diff_kind) {
    case DiffKind.DIFF_DELETE:
        classes.push(styles.diff_remove)
        break
    case DiffKind.DIFF_INSERT:
        classes.push(styles.diff_add)
        break
    case DiffKind.DIFF_REPLACE:
        classes.push(styles.diff_change)
        break
    }

    return <div
        className={classNames(styles.cell, classes, {
            [styles.highlight]: hasLineNo && cell.instruction.line_number == selectedSourceLine,
        })}
    >
        {hasLineNo && <span className={styles.lineNumber}><button onClick={() => scrollToLineNumber(sourceEditor, cell.instruction.line_number)}>{cell.instruction.line_number}</button></span>}
        <FormatDiffText insDiff={cell} baseAddress={baseAddress} highlighter={highlighter} />
    </div>
}

function findSymbol(object: ObjectDiff | null, symbol_name: string): FunctionDiff | null {
    if (!object) {
        return null
    }
    for (const section of object.sections) {
        for (const symbol_diff of section.functions) {
            if (symbol_diff.symbol.name === symbol_name) {
                return symbol_diff
            }
        }
    }
    return null
}

export const DiffRow = memo(function DiffRow({ data, index, style }: { data: DiffListData, index: number, style: CSSProperties }) {
    const leftIns = data.left?.instructions?.[index]
    const leftSymbol = data.left?.symbol
    const rightIns = data.right?.instructions?.[index]
    const rightSymbol = data.right?.symbol
    return <li
        className={styles.row}
        style={{
            ...style,
            top: `${parseFloat(style.top.toString()) + PADDING_TOP}px`,
            lineHeight: `${style.height.toString()}px`,
        }}
    >
        <DiffCell cell={leftIns} baseAddress={leftSymbol?.address} highlighter={data.highlighters[0]} />
        <DiffCell cell={rightIns} baseAddress={rightSymbol?.address} highlighter={data.highlighters[1]} />
    </li>
}, areEqual)

export type DiffListData = {
    left: FunctionDiff | undefined
    right: FunctionDiff | undefined
    itemCount: number
    highlighters: Highlighter[]
}

export const createDiffListData = memoize((
    diff: DiffResult | null,
    diffLabel: string,
    highlighters: Highlighter[]
): DiffListData => {
    const left = findSymbol(diff?.left, diffLabel)
    const right = findSymbol(diff?.right, diffLabel)
    const itemCount = Math.min(left?.instructions.length ?? 0, right?.instructions.length ?? 0)
    return { left, right, itemCount, highlighters }
})
