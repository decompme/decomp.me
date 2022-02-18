/* eslint css-modules/no-unused-class: off */

import { ReactNode, useEffect, useState } from "react"

import Ansi from "ansi-to-react"
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

function DiffColumn({ diff, prop, header, className }: {
    diff: api.DiffOutput | null
    prop: keyof api.DiffRow & keyof api.DiffHeader
    header: ReactNode
    className?: string
}) {
    return <resizer.Section className={classNames(styles.column, className)} minSize={100}>
        <div className={classNames(styles.row, styles.header)}>
            {header}
        </div>
        <div className={styles.body}>
            {diff?.rows?.map?.((row, i) => (
                <div key={i} className={styles.row}>
                    {typeof row[prop]?.src_line != "undefined" && <span className={styles.lineNumber}>{row[prop].src_line}</span>}
                    {row[prop] && <FormatDiffText texts={row[prop].text} />}
                </div>
            ))}
        </div>
    </resizer.Section>
}

enum ProblemState {
    NO_PROBLEMS,
    WARNINGS,
    ERRORS,
}

function getProblemState(compilation: api.Compilation) {
    if (compilation.diff_output) {
        if (compilation.errors) {
            return ProblemState.WARNINGS
        } else {
            return ProblemState.NO_PROBLEMS
        }
    } else {
        return ProblemState.ERRORS
    }
}

export type Props = {
    compilation: api.Compilation
    isCompiling?: boolean
}

export default function Diff({ compilation, isCompiling }: Props) {
    const [diff, setDiff] = useState<api.DiffOutput | null>(null)
    const problemState = getProblemState(compilation)

    useEffect(() => {
        if (compilation.diff_output)
            setDiff(compilation.diff_output)
    }, [compilation.diff_output])

    return <resizer.Container vertical className={styles.container}>
        <resizer.Section minSize={100}>
            <resizer.Container className={styles.diff}>
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
                    className={classNames({ [styles.greyOut]: problemState == ProblemState.ERRORS })}
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
        </resizer.Section>
        <resizer.Bar
            size={1}
            className={styles.bar}
            expandInteractiveArea={{ top: 2, bottom: 2 }}
        />
        {(problemState != ProblemState.NO_PROBLEMS) && <resizer.Section className={styles.problems}>
            <h2>Compiler {problemState == ProblemState.ERRORS ? "errors" : "warnings"}</h2>
            <div className={styles.log}>
                <Ansi>{compilation.errors}</Ansi>
            </div>
        </resizer.Section>}
    </resizer.Container>
}
