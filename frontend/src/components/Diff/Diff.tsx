/* eslint css-modules/no-unused-class: off */

import { createContext, forwardRef, HTMLAttributes, ReactNode, useContext } from "react"

import classNames from "classnames"
import * as resizer from "react-simple-resizer"
import AutoSizer from "react-virtualized-auto-sizer"
import { FixedSizeList } from "react-window"

import * as api from "../../lib/api"
import Loading from "../loading.svg"

import styles from "./Diff.module.scss"

const PADDING_TOP = 48
const PADDING_BOTTOM = 8

type Prop = keyof api.DiffRow & keyof api.DiffHeader

const DiffContext = createContext<{
    prop: Prop
    selectedSourceLine: number | null
}>(undefined)

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

function DiffRow({ data, index, style }) {
    const { prop, selectedSourceLine } = useContext(DiffContext)
    const row = data[index]

    return <div
        className={classNames({
            [styles.row]: true,
            [styles.highlight]: (typeof row[prop]?.src_line != "undefined" && row[prop]?.src_line == selectedSourceLine),
        })}
        style={{
            ...style,
            top: `${parseFloat(style.top.toString()) + PADDING_TOP}px`,
        }}
    >
        {typeof row[prop]?.src_line != "undefined" && <span className={styles.lineNumber}>{row[prop].src_line}</span>}
        {row[prop] && <FormatDiffText texts={row[prop].text} />}
    </div>
}

// https://github.com/bvaughn/react-window#can-i-add-padding-to-the-top-and-bottom-of-a-list
const innerElementType = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ style, ...rest }, ref) => {
    return <div
        ref={ref}
        style={{
            ...style,
            height: `${parseFloat(style.height.toString()) + PADDING_TOP + PADDING_BOTTOM}px`,
        }}
        {...rest}
    />
})
innerElementType.displayName = "innerElementType"

function DiffColumn({ diff, prop, header, className, selectedSourceLine }: {
    diff: api.DiffOutput | null
    prop: Prop
    header: ReactNode
    selectedSourceLine: number | null
    className?: string
}) {
    return <DiffContext.Provider value={{ prop, selectedSourceLine }}>
        <resizer.Section className={classNames(styles.column, className)} minSize={100}>
            <div className={classNames(styles.row, styles.header)}>
                {header}
            </div>
            {diff?.rows && <AutoSizer>
                {({ height, width }) => (
                    <FixedSizeList
                        className={styles.body}
                        itemCount={diff.rows.length}
                        itemData={diff.rows}
                        itemSize={19.2}
                        width={width}
                        height={height}
                        innerElementType={innerElementType}
                    >
                        {DiffRow}
                    </FixedSizeList>
                )}
            </AutoSizer>}
        </resizer.Section>
    </DiffContext.Provider>
}

export type Props = {
    diff: api.DiffOutput
    isCompiling: boolean
    isCurrentOutdated: boolean
    selectedSourceLine: number | null
}

export default function Diff({ diff, isCompiling, isCurrentOutdated, selectedSourceLine }: Props) {
    return <resizer.Container className={styles.diff}>
        <DiffColumn diff={diff} prop="base" header="Target" selectedSourceLine={null} />
        <resizer.Bar
            size={1}
            className={styles.bar}
            expandInteractiveArea={{ left: 2, right: 2 }}
        />
        <DiffColumn
            diff={diff}
            prop="current"
            header={<>
                Current
                {isCompiling && <Loading width={20} height={20} />}
            </>}
            className={classNames({ [styles.outdated]: isCurrentOutdated })}
            selectedSourceLine={selectedSourceLine}
        />
        {diff?.header?.previous && <>
            <resizer.Bar
                size={1}
                className={styles.bar}
                expandInteractiveArea={{ left: 2, right: 2 }}
            />
            <DiffColumn diff={diff} prop="previous" header="Saved" selectedSourceLine={null} />
        </>}
    </resizer.Container>
}
