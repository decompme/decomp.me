/* eslint css-modules/no-unused-class: off */

import { ReactNode } from "react"

import classNames from "classnames"
import * as resizer from "react-simple-resizer"

import * as api from "../../lib/api"
import Loading from "../loading.svg"

import styles from "./Diff.module.scss"

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

function DiffColumn({ diff, prop, header, className, selectedSourceLine }: {
    diff: api.DiffOutput | null
    prop: keyof api.DiffRow & keyof api.DiffHeader
    header: ReactNode
    className?: string
    selectedSourceLine?: number | null
}) {
    return <resizer.Section className={classNames(styles.column, className)} minSize={100}>
        <div className={classNames(styles.row, styles.header)}>
            {header}
        </div>
        <div className={styles.body}>
            {diff?.rows?.map?.((row, i) => (
                <div key={i} className={classNames({
                    [styles.row]: true,
                    [styles.highlight]: (typeof row[prop]?.src_line != "undefined" && row[prop]?.src_line == selectedSourceLine),
                })}>
                    {typeof row[prop]?.src_line != "undefined" && <span className={styles.lineNumber}>{row[prop].src_line}</span>}
                    {row[prop] && <FormatDiffText texts={row[prop].text} />}
                </div>
            ))}
        </div>
    </resizer.Section>
}

export type Props = {
    diff: api.DiffOutput
    isCompiling: boolean
    isCurrentOutdated: boolean
    selectedSourceLine: number | null
}

export default function Diff({ diff, isCompiling, isCurrentOutdated, selectedSourceLine }: Props) {
    return <resizer.Container className={styles.diff}>
        <DiffColumn diff={diff} prop="base" header="Target" />
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
            <DiffColumn diff={diff} prop="previous" header="Saved" />
        </>}
    </resizer.Container>
}
