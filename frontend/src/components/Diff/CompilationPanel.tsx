import { useMemo, useRef, useState } from "react"

import { ChevronDownIcon, ChevronUpIcon } from "@primer/octicons-react"
import { Allotment, AllotmentHandle } from "allotment"
import Ansi from "ansi-to-react"

import * as api from "@/lib/api"
import { interdiff } from "@/lib/interdiff"

import GhostButton from "../GhostButton"

import Diff from "./Diff"

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

export type ThreeWayDiffBase = {
    diff?: api.DiffOutput
}

export type Props = {
    compilation: api.Compilation
    isCompiling?: boolean
    isCompilationOld?: boolean
    selectedSourceLine: number | null
    threeWayDiffBase: ThreeWayDiffBase
}

export default function CompilationPanel({ compilation, isCompiling, isCompilationOld, selectedSourceLine, threeWayDiffBase }: Props) {
    const usedCompileRef = useRef<api.Compilation | null>(null)
    const problemState = getProblemState(compilation)
    const [threeWayDiffEnabled, setThreeWayDiffEnabled] = useState(false)

    // Only update the diff if it's never been set or if the compilation succeeded
    if (!usedCompileRef.current || compilation.success) {
        usedCompileRef.current = compilation
    }

    const usedDiff = usedCompileRef.current?.diff_output ?? null

    // If this is the first time we re-render with a new diff base object (e.g.
    // upon save), store the three-way diff base.
    if (!threeWayDiffBase.diff && usedCompileRef.current?.success && usedDiff) {
        threeWayDiffBase.diff = usedDiff
    }

    const diff = useMemo(
        () => {
            if (threeWayDiffEnabled)
                return interdiff(usedDiff, threeWayDiffBase.diff ?? null)
            else
                return usedDiff
        },
        [threeWayDiffEnabled, usedDiff, threeWayDiffBase.diff]
    )

    const container = useRef<HTMLDivElement>(null)
    const allotment = useRef<AllotmentHandle>(null)

    const problemsCollapsedHeight = 37
    const problemsDefaultHeight = 320
    const [isProblemsCollapsed, setIsProblemsCollapsed] = useState(problemState == ProblemState.NO_PROBLEMS)

    return <div ref={container} className="h-full w-full">
        <Allotment
            ref={allotment}
            vertical
            onChange={([_top, bottom]) => {
                if (_top === undefined || bottom === undefined) {
                    return
                }
                setIsProblemsCollapsed(bottom <= problemsCollapsedHeight)
            }}
        >
            <Allotment.Pane>
                <Diff
                    diff={diff}
                    isCompiling={isCompiling}
                    isCurrentOutdated={isCompilationOld || problemState == ProblemState.ERRORS}
                    threeWayDiffEnabled={threeWayDiffEnabled}
                    setThreeWayDiffEnabled={setThreeWayDiffEnabled}
                    selectedSourceLine={selectedSourceLine}
                />
            </Allotment.Pane>
            <Allotment.Pane
                minSize={problemsCollapsedHeight}
                preferredSize={isProblemsCollapsed ? problemsCollapsedHeight : problemsDefaultHeight}
            >
                <div className="flex h-full w-full flex-col">
                    <h2 className="flex items-center border-b border-b-gray-5 p-1 pl-3">
                        <span className="text-sm font-medium">
                            {(problemState == ProblemState.NO_PROBLEMS) ? "No problems" : "Problems"}
                        </span>
                        <div className="grow" />
                        <GhostButton
                            className="text-gray-11"
                            onClick={() => {
                                const containerHeight = container.current?.clientHeight ?? 0
                                const newProblemsHeight = isProblemsCollapsed ? problemsDefaultHeight : problemsCollapsedHeight
                                allotment.current?.resize([
                                    containerHeight - newProblemsHeight,
                                    newProblemsHeight,
                                ])
                            }}
                        >
                            {isProblemsCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
                        </GhostButton>
                    </h2>

                    <div className="h-full grow overflow-auto whitespace-pre px-3 py-2 font-mono text-xs leading-snug">
                        <Ansi>{compilation.compiler_output}</Ansi>
                    </div>
                </div>
            </Allotment.Pane>
        </Allotment>
    </div>
}
