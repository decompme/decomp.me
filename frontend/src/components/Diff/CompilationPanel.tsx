import { useMemo, useRef, useState } from "react";

import { ChevronDownIcon, ChevronUpIcon } from "@primer/octicons-react";
import { Allotment, type AllotmentHandle } from "allotment";
import Ansi from "ansi-to-react";

import type * as api from "@/lib/api";
import { interdiff } from "@/lib/interdiff";
import { ThreeWayDiffBase, useThreeWayDiffBase } from "@/lib/settings";

import GhostButton from "../GhostButton";

import Diff from "./Diff";

function getProblemState(compilation: api.Compilation): ProblemState {
    if (!compilation.success) {
        return ProblemState.ERRORS;
    } else if (compilation.compiler_output) {
        return ProblemState.WARNINGS;
    } else {
        return ProblemState.NO_PROBLEMS;
    }
}

export enum ProblemState {
    NO_PROBLEMS = 0,
    WARNINGS = 1,
    ERRORS = 2,
}

export type PerSaveObj = {
    diff?: api.DiffOutput;
};

export type Props = {
    scratch: api.Scratch;
    compilation: api.Compilation;
    isCompiling?: boolean;
    isCompilationOld?: boolean;
    selectedSourceLine: number | null;
    perSaveObj: PerSaveObj;
};

export default function CompilationPanel({
    scratch,
    compilation,
    isCompiling,
    isCompilationOld,
    selectedSourceLine,
    perSaveObj,
}: Props) {
    const usedCompilationRef = useRef<api.Compilation | null>(null);
    const problemState = getProblemState(compilation);
    const [threeWayDiffBase] = useThreeWayDiffBase();
    const [threeWayDiffEnabled, setThreeWayDiffEnabled] = useState(false);
    const prevCompilation = usedCompilationRef.current;

    // Only update the diff if it's never been set or if the compilation succeeded
    if (!usedCompilationRef.current || compilation.success) {
        usedCompilationRef.current = compilation;
    }

    const usedDiff = usedCompilationRef.current?.diff_output ?? null;

    // If this is the first time we re-render after a save, store the diff
    // as a possible three-way diff base.
    if (!perSaveObj.diff && usedCompilationRef.current?.success && usedDiff) {
        perSaveObj.diff = usedDiff;
    }

    const prevDiffRef = useRef<api.DiffOutput | null>(null);

    let usedBase: api.DiffOutput;
    if (threeWayDiffBase === ThreeWayDiffBase.SAVED) {
        usedBase = perSaveObj.diff ?? null;
        prevDiffRef.current = null;
    } else {
        if (compilation.success && compilation !== prevCompilation) {
            prevDiffRef.current = prevCompilation?.diff_output ?? null;
        }
        usedBase = prevDiffRef.current ?? null;
    }

    const diff = useMemo(() => {
        if (threeWayDiffEnabled) return interdiff(usedDiff, usedBase);
        else return usedDiff;
    }, [threeWayDiffEnabled, usedDiff, usedBase]);

    const container = useRef<HTMLDivElement>(null);
    const allotment = useRef<AllotmentHandle>(null);

    const problemsCollapsedHeight = 37;
    const problemsDefaultHeight = 320;
    const [isProblemsCollapsed, setIsProblemsCollapsed] = useState(
        problemState === ProblemState.NO_PROBLEMS,
    );

    return (
        <div ref={container} className="size-full">
            <Allotment
                ref={allotment}
                vertical
                onChange={([_top, bottom]) => {
                    if (_top === undefined || bottom === undefined) {
                        return;
                    }
                    setIsProblemsCollapsed(bottom <= problemsCollapsedHeight);
                }}
            >
                <Allotment.Pane>
                    <Diff
                        diff={diff}
                        diffLabel={scratch.diff_label}
                        isCompiling={isCompiling}
                        isCurrentOutdated={
                            isCompilationOld ||
                            problemState === ProblemState.ERRORS
                        }
                        threeWayDiffEnabled={threeWayDiffEnabled}
                        setThreeWayDiffEnabled={setThreeWayDiffEnabled}
                        threeWayDiffBase={threeWayDiffBase}
                        selectedSourceLine={selectedSourceLine}
                    />
                </Allotment.Pane>
                <Allotment.Pane
                    minSize={problemsCollapsedHeight}
                    preferredSize={
                        isProblemsCollapsed
                            ? problemsCollapsedHeight
                            : problemsDefaultHeight
                    }
                >
                    <div className="flex size-full flex-col">
                        <h2 className="flex items-center border-b border-b-gray-5 p-1 pl-3">
                            <GhostButton
                                className="flex w-max grow justify-between text-gray-11"
                                onClick={() => {
                                    const containerHeight =
                                        container.current?.clientHeight ?? 0;
                                    const newProblemsHeight =
                                        isProblemsCollapsed
                                            ? problemsDefaultHeight
                                            : problemsCollapsedHeight;
                                    allotment.current?.resize([
                                        containerHeight - newProblemsHeight,
                                        newProblemsHeight,
                                    ]);
                                }}
                            >
                                <span className="font-medium text-sm">
                                    {problemState === ProblemState.NO_PROBLEMS
                                        ? "No problems"
                                        : "Problems"}
                                </span>
                                {isProblemsCollapsed ? (
                                    <ChevronUpIcon />
                                ) : (
                                    <ChevronDownIcon />
                                )}
                            </GhostButton>
                        </h2>

                        <div className="h-full grow overflow-auto whitespace-pre px-3 py-2 font-mono text-xs leading-snug">
                            <Ansi>{compilation.compiler_output}</Ansi>
                        </div>
                    </div>
                </Allotment.Pane>
            </Allotment>
        </div>
    );
}
