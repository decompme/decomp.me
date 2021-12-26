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
            <div className={classNames(styles.row, styles.header)}>
                <div className={styles.column}>
                    <FormatDiffText texts={diff.header.base} />
                </div>
                <div className={styles.column}>
                    <FormatDiffText texts={diff.header.current} />
                </div>
                {threeWay && <div className={styles.column}>
                    <FormatDiffText texts={diff.header.previous} />
                </div>}
            </div>
            <div className={styles.body}>
                {diff.rows.map((row, i) => (
                    <div key={i} className={styles.row}>
                        <div className={styles.column}>
                            {row.base && <FormatDiffText texts={row.base.text} />}
                        </div>
                        <div className={styles.column}>
                            {typeof row.current?.src_line != "undefined" && <span className={styles.lineNumber}>{row.current.src_line}</span>}
                            {row.current && <FormatDiffText texts={row.current.text} />}
                        </div>
                        {threeWay && <div className={styles.column}>
                            {row.previous && <FormatDiffText texts={row.previous.text} />}
                        </div>}
                    </div>
                ))}
            </div>
        </div>
    }
}
