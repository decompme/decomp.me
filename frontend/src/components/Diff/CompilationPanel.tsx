import { useEffect, useState } from "react"

import Ansi from "ansi-to-react"
import * as resizer from "react-simple-resizer"

import * as api from "../../lib/api"

import styles from "./CompilationPanel.module.scss"
import Diff from "./Diff"

function getProblemState(compilation: api.Compilation): ProblemState {
    if (!compilation.succeeded) {
        return ProblemState.ERRORS
    } else if (compilation.compiler_output) {
        return ProblemState.WARNINGS
    } else {
        return ProblemState.NO_PROBLEMS
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
    isCompilationOld?: boolean
    selectedSourceLine: number | null
}

export default function CompilationPanel({ compilation, isCompiling, isCompilationOld, selectedSourceLine }: Props) {
    const [diff, setDiff] = useState<api.DiffOutput | null>(null)
    const problemState = getProblemState(compilation)

    // Only update the diff if it's never been set or if the compilation succeeded
    useEffect(() => {
        if (!diff || compilation.succeeded) {
            setDiff(compilation.diff_output)
        }
    }, [compilation.diff_output, compilation.succeeded, diff])

    return <resizer.Container vertical className={styles.container}>
        <resizer.Section minSize={100}>
            <Diff
                diff={diff}
                isCompiling={isCompiling}
                isCurrentOutdated={isCompilationOld || problemState == ProblemState.ERRORS}
                selectedSourceLine={selectedSourceLine}
            />
        </resizer.Section>
        <resizer.Bar
            size={1}
            className={styles.bar}
            expandInteractiveArea={{ top: 2, bottom: 2 }}
        />
        {(problemState != ProblemState.NO_PROBLEMS) && <resizer.Section className={styles.problems} minSize={100}>
            <h2>Compiler {problemState == ProblemState.ERRORS ? "errors" : "warnings"}</h2>
            <div className={styles.log}>
                <Ansi>{compilation.compiler_output}</Ansi>
            </div>
        </resizer.Section>}
    </resizer.Container>
}
