/* eslint css-modules/no-unused-class: off */

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
            <table className={styles.diff}>
                <tr>
                    <th><FormatDiffText texts={diff.header.base} /></th>
                    <th>{/* Line */}</th>
                    <th><FormatDiffText texts={diff.header.current} /></th>
                    { threeWay && <th><FormatDiffText texts={diff.header.previous} /></th> }
                </tr>
                {diff.rows.map((row, i) => (
                    <tr key={i}>
                        <td>{row.base && <FormatDiffText texts={row.base.text} />}</td>
                        <td><span className={styles.lineNumber}>{(row.current) && row.current.src_line}</span></td>
                        <td>{row.current && <FormatDiffText texts={row.current.text} />}</td>
                        {threeWay && <td>
                            { row.previous && <FormatDiffText texts={row.previous.text} />}
                        </td>}
                    </tr>
                ))}
            </table>
        </div>
    }
}
