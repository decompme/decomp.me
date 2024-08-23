/* eslint css-modules/no-unused-class: off */

import { CSSProperties, HTMLAttributes, createContext, forwardRef, memo, useContext, useRef, useState } from "react"

import classNames from "classnames"
import memoize from "memoize-one"
import { DiffResult, DiffKind, FunctionDiff, ObjectDiff, InstructionDiff, displayDiff, oneof, SectionDiff, SectionKind } from "objdiff-wasm"
import AutoSizer from "react-virtualized-auto-sizer"
import { FixedSizeList, areEqual } from "react-window"

import { useSize } from "@/lib/hooks"
import { useCodeFontSize } from "@/lib/settings"

import Loading from "../loading.svg"

import DragBar from "./DragBar"
import { Highlighter, useHighlighers } from "./Highlighter"
import styles from "./NewDiff.module.scss"

const PADDING_TOP = 8
const PADDING_BOTTOM = 8

const SelectedSourceLineContext = createContext<number | null>(null)

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
    const hasLineNo = typeof cell?.instruction?.line_number != "undefined"

    if (!cell)
        return <div className={classNames(styles.cell, className)} />

    const classes = []
    if (cell?.diff_kind) {
        classes.push(styles.has_diff)
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
        {hasLineNo && <span className={styles.lineNumber}>{cell.instruction.line_number}</span>}
        <FormatDiffText insDiff={cell} baseAddress={baseAddress} highlighter={highlighter} />
    </div>
}

const DiffRow = memo(function DiffRow({ data, index, style }: { data: DiffListData, index: number, style: CSSProperties }) {
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
    left: FunctionDiff | undefined
    right: FunctionDiff | undefined
    itemCount: number
    highlighters: Highlighter[]
}

const createDiffListData = memoize((
    diff: DiffResult | null,
    selectedSymbol: string,
    highlighters: Highlighter[]
): DiffListData => {
    const left = findSymbol(diff?.left, selectedSymbol)
    const right = findSymbol(diff?.right, selectedSymbol)
    const itemCount = Math.min(left?.instructions.length ?? 0, right?.instructions.length ?? 0)
    return { left, right, itemCount, highlighters }
})

function DiffBody({ diff, diffLabel, fontSize }: { diff: DiffResult | null, diffLabel: string | null, fontSize: number | undefined }) {
    const { highlighters, setHighlightAll } = useHighlighers(2)
    const itemData = createDiffListData(diff, diffLabel, highlighters)

    return <div
        className={styles.bodyContainer}
        onClick={() => {
            // If clicks propagate to the container, clear all
            setHighlightAll(null)
        }}
    >
        <AutoSizer>
            {({ height, width }: { height: number | undefined, width: number | undefined }) => (
                <FixedSizeList
                    className={styles.body}
                    itemCount={itemData.itemCount}
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
        </AutoSizer>
    </div>
}

interface SymbolData {
    leftSection: SectionDiff | undefined
    rightSection: SectionDiff | undefined
    itemCount: number
}

const createSymbolData = memoize((diff: DiffResult | null): SymbolData => {
    const leftSection = diff?.left?.sections?.find(section => section.kind == SectionKind.SECTION_TEXT)
    const rightSection = diff?.right?.sections?.find(section => section.kind == SectionKind.SECTION_TEXT)
    const itemCount = Math.max(leftSection?.functions.length ?? 0, rightSection?.functions.length ?? 0)
    return { leftSection, rightSection, itemCount }
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SymbolSelector({ diff, fontSize }: { diff: DiffResult | null, fontSize: number | undefined }) {
    const itemData = createSymbolData(diff)
    return <div className={styles.bodyContainer}>
        <AutoSizer>
            {({ height, width }: { height: number | undefined, width: number | undefined }) => (
                <FixedSizeList
                    className={styles.body}
                    itemCount={itemData.itemCount}
                    itemData={itemData}
                    itemSize={(fontSize ?? 12) * 1.33}
                    overscanCount={40}
                    width={width}
                    height={height}
                    innerElementType={innerElementType}
                >
                    {SymbolRow}
                </FixedSizeList>
            )}
        </AutoSizer>
    </div>
}

const SymbolRow = memo(function SymbolRow({ data, index, style }: { data: SymbolData, index: number, style: CSSProperties }) {
    const { leftSection, rightSection } = data
    return <li
        className={styles.row}
        style={{
            ...style,
            top: `${parseFloat(style.top.toString()) + PADDING_TOP}px`,
            lineHeight: `${style.height.toString()}px`,
        }}
    >
        <SymbolCell symbol={leftSection?.functions?.[index]} />
        <SymbolCell symbol={rightSection?.functions?.[index]} />
    </li>
}, areEqual)

function SymbolCell({ symbol }: { symbol: FunctionDiff | undefined }) {
    return <div className={classNames(styles.cell)}>
        {symbol?.symbol.name}
    </div>
}

export type Props = {
    diff: DiffResult | null
    diffLabel: string | null
    isCompiling: boolean
    isCurrentOutdated: boolean
    selectedSourceLine: number | null
}

export default function NewDiff({ diff, diffLabel, isCompiling, isCurrentOutdated, selectedSourceLine }: Props) {
    const [fontSize] = useCodeFontSize()
    // const [leftSymbol, setLeftSymbol] = useState<string | null>(null)
    // const [rightSymbol, setRightSymbol] = useState<string | null>(null)

    const container = useSize<HTMLDivElement>()

    const [bar1Pos, setBar1Pos] = useState(NaN)
    // const [bar2Pos, setBar2Pos] = useState(NaN)

    const columnMinWidth = 100
    const clampedBar1Pos = Math.max(columnMinWidth, Math.min(container.width - columnMinWidth, bar1Pos))
    const clampedBar2Pos = container.width

    // Distribute the bar positions across the container when its width changes
    const updateBarPositions = (threeWayDiffEnabled: boolean) => {
        const numSections = threeWayDiffEnabled ? 3 : 2
        setBar1Pos(container.width / numSections)
        // setBar2Pos(container.width / numSections * 2)
    }
    const lastContainerWidthRef = useRef(NaN)
    if (lastContainerWidthRef.current !== container.width && container.width) {
        lastContainerWidthRef.current = container.width
        updateBarPositions(false)
    }

    // if (!leftSymbol || !rightSymbol) {
    //     return <div
    //         ref={container.ref}
    //         className={styles.diff}
    //         style={{
    //             "--diff-font-size": typeof fontSize == "number" ? `${fontSize}px` : "",
    //             "--diff-left-width": `${clampedBar1Pos}px`,
    //             "--diff-right-width": `${container.width - clampedBar2Pos}px`,
    //             "--diff-current-filter": isCurrentOutdated ? "grayscale(25%) brightness(70%)" : "",
    //         } as CSSProperties}
    //     >
    //         <DragBar pos={clampedBar1Pos} onChange={setBar1Pos} />
    //         <div className={styles.headers}>
    //             <div className={styles.header}>
    //                 Target
    //             </div>
    //             <div className={styles.header}>
    //                 Current
    //                 {isCompiling && <Loading width={20} height={20} />}
    //             </div>
    //         </div>
    //         <SymbolSelector diff={diff} fontSize={fontSize} />
    //     </div>
    // }

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
        <div className={styles.headers}>
            <div className={styles.header}>
                Target
            </div>
            <div className={styles.header}>
                Current
                {isCompiling && <Loading width={20} height={20} />}
            </div>
        </div>
        <SelectedSourceLineContext.Provider value={selectedSourceLine}>
            <DiffBody diff={diff} diffLabel={diffLabel} fontSize={fontSize} />
        </SelectedSourceLineContext.Provider>
    </div>
}
