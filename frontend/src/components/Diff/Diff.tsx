/* eslint css-modules/no-unused-class: off */

import { ReactNode } from "react"

import Ansi from "ansi-to-react"
import classNames from "classnames"
import * as resizer from "react-simple-resizer"

import * as api from "../../lib/api"
import Loading from "../loading.svg"

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

function DiffColumn({ diff, prop, header }: {
    diff: api.DiffOutput
    prop: keyof api.DiffRow & keyof api.DiffHeader
    header: ReactNode
}) {
    return <resizer.Section className={styles.column} minSize={100}>
        <div className={classNames(styles.row, styles.header)}>
            {header}
        </div>
        <div className={styles.body}>
            {diff.rows.map((row, i) => (
                <div key={i} className={styles.row}>
                    {typeof row[prop]?.src_line != "undefined" && <span className={styles.lineNumber}>{row[prop].src_line}</span>}
                    {row[prop] && <FormatDiffText texts={row[prop].text} />}
                </div>
            ))}
        </div>
    </resizer.Section>
}

export type Props = {
    compilation: api.Compilation
    isCompiling?: boolean
}

export default function Diff({ compilation, isCompiling }: Props) {
    const diff: api.DiffOutput = compilation.diff_output

    if (!diff || diff.error) {
        return <div className={styles.container}>
            {compilation.errors && <div className={styles.log}><Ansi>{compilation.errors}</Ansi></div>}
            {(diff && diff.error) && <div className={styles.log}>{diff.error}</div>}
        </div>
    } else {
        const threeWay = !!diff.header.previous

        return <resizer.Container className={styles.container}>
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
            />
            {threeWay && <>
                <resizer.Bar
                    size={1}
                    className={styles.bar}
                    expandInteractiveArea={{ left: 2, right: 2 }}
                />
                <DiffColumn diff={diff} prop="previous" header="Saved" />
            </>}
        </resizer.Container>
    }
}
