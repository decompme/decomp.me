/* eslint css-modules/no-unused-class: off */

import classNames from "classnames"

import * as api from "../../lib/api"

import styles from "./Diff.module.css"

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

function DiffColumn({ diff, prop }: {
    diff: api.DiffOutput
    prop: keyof api.DiffRow & keyof api.DiffHeader
}) {
    return <div className={styles.column}>
        <div className={classNames(styles.row, styles.header)}>
            <FormatDiffText texts={diff.header[prop]} />
        </div>
        <div className={styles.body}>
            {diff.rows.map((row, i) => (
                <div key={i} className={styles.row}>
                    {typeof row[prop]?.src_line != "undefined" && <span className={styles.lineNumber}>{row[prop].src_line}</span>}
                    {row[prop] && <FormatDiffText texts={row[prop].text} />}
                </div>
            ))}
        </div>
    </div>
}

export type Props = {
    compilation: api.Compilation
}

export default function Diff({ compilation }: Props) {
    const diff: api.DiffOutput = compilation.diff_output
    if (!diff || diff.error) {
        return <div className={styles.container}>
            {compilation.errors && <div className={styles.log}>{compilation.errors}</div>}
            {(diff && diff.error) && <div className={styles.log}>{diff.error}</div>}
        </div>
    } else {
        const threeWay = !!diff.header.previous
        return <div className={styles.container}>
            <DiffColumn diff={diff} prop="base" />
            <DiffColumn diff={diff} prop="current" />
            {threeWay && <DiffColumn diff={diff} prop="previous" />}
        </div>
    }
}
