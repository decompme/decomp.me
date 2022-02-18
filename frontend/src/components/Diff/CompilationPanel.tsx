import { useEffect, useState } from "react"

import Ansi from "ansi-to-react"
import * as resizer from "react-simple-resizer"

import * as api from "../../lib/api"

import styles from "./CompilationPanel.module.scss"
import Diff from "./Diff"

function getProblemState(compilation: api.Compilation): ProblemState {
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

export enum ProblemState {
    NO_PROBLEMS,
    WARNINGS,
    ERRORS,
}

export type Props = {
    compilation: api.Compilation
    isCompiling?: boolean
}

export default function CompilationPanel({ compilation, isCompiling }: Props) {
    const [diff, setDiff] = useState<api.DiffOutput | null>(null)
    const problemState = getProblemState(compilation)

    useEffect(() => {
        if (compilation.diff_output)
            setDiff(compilation.diff_output)
    }, [compilation.diff_output])

    return <resizer.Container vertical className={styles.container}>
        <resizer.Section minSize={100}>
            <Diff diff={diff} problemState={problemState} isCompiling={isCompiling} />
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
