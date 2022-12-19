import { useEffect, useRef, useState } from "react"

import { ChevronDownIcon } from "@primer/octicons-react"
import Ansi from "ansi-to-react"
import classNames from "classnames"
import * as resizer from "react-simple-resizer"

import * as api from "../../lib/api"

import styles from "./CompilationPanel.module.scss"
import Diff from "./Diff"

const CLOSED_BOTTOM_PANEL_SIZE = 35

function getProblemState(compilation: api.Compilation): ProblemState {
    if (!compilation.success) {
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
    const resizerContainer = useRef<resizer.Container>(null)

    // Only update the diff if it's never been set or if the compilation succeeded
    useEffect(() => {
        if (!diff || compilation.success) {
            setDiff(compilation.diff_output)
        }
    }, [compilation.diff_output, compilation.success, diff])

    const toggleBottomPanel = () => {
        const resizer = resizerContainer.current.getResizer()
        if (resizer.getSectionSize(1) == CLOSED_BOTTOM_PANEL_SIZE) {
            resizer.resizeSection(1, { toSize: 300 })
        } else {
            resizer.resizeSection(1, { toSize: CLOSED_BOTTOM_PANEL_SIZE })
        }
        resizerContainer.current.applyResizer(resizer)
    }

    return <resizer.Container vertical ref={resizerContainer} className={styles.container}>
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
            className={classNames(styles.bar, { [styles.noPointerEvents]: problemState == ProblemState.NO_PROBLEMS })}
            expandInteractiveArea={{ top: 2, bottom: 2 }}
        />
        <resizer.Section
            className={styles.problems}
            maxSize={problemState == ProblemState.NO_PROBLEMS ? CLOSED_BOTTOM_PANEL_SIZE : undefined}
            minSize={CLOSED_BOTTOM_PANEL_SIZE}
        >
            {problemState == ProblemState.NO_PROBLEMS ? <h2>
                Compiled successfully
            </h2> : <h2 onClick={toggleBottomPanel} className={styles.bottomPanelClickable}>
                {problemState == ProblemState.ERRORS ? "Compilation failed" : "Compiled with warnings"}
                <ChevronDownIcon />
            </h2>}
            {problemState != ProblemState.NO_PROBLEMS && <div className={styles.log}>
                <Ansi>{compilation.compiler_output}</Ansi>
            </div>}
        </resizer.Section>
    </resizer.Container>
}
