import { useMemo, useRef, useState } from "react";

import { ChevronDownIcon, ChevronUpIcon } from "@primer/octicons-react";
import { Allotment, type AllotmentHandle } from "allotment";
import Ansi from "ansi-to-react";

import type * as api from "@/lib/api";
import { interdiff } from "@/lib/interdiff";
import {
    ThreeWayDiffBase,
    useAiSettings,
    useThreeWayDiffBase,
} from "@/lib/settings";

import GhostButton from "../GhostButton";

import Diff from "./Diff";
import Chat from "../Chat/Chat";

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
    const { aiApiKey } = useAiSettings();

    // Only update the diff if it's never been set or if the compilation succeeded
    if (!usedCompilationRef.current || compilation.success) {
        usedCompilationRef.current = compilation;
    }

    const usedDiff = usedCompilationRef.current?.diff_output ?? null;
    const objdiffResult = usedCompilationRef.current?.objdiff_output ?? null;

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

    const hasAIPanel = Boolean(aiApiKey);

    const container = useRef<HTMLDivElement>(null);
    const allotment = useRef<AllotmentHandle>(null);

    const collapsedHeight = 37;

    const problemsDefaultHeight = 290;
    const [isProblemsCollapsed, setIsProblemsCollapsed] = useState(
        problemState === ProblemState.NO_PROBLEMS,
    );
    const problemsHeight = useRef(
        isProblemsCollapsed ? collapsedHeight : problemsDefaultHeight,
    );

    const aiDefaultHeightRef = 250;
    const [isAICollapsed, setIsAICollapsed] = useState(false);
    const aiHeight = useRef(aiDefaultHeightRef);

    const togglePanelCollapsed = (panelName: "problems" | "ai") => {
        if (panelName === "problems") {
            setIsProblemsCollapsed(!isProblemsCollapsed);
            problemsHeight.current = isProblemsCollapsed
                ? problemsDefaultHeight
                : collapsedHeight;
        } else {
            setIsAICollapsed(!isAICollapsed);
            aiHeight.current = isAICollapsed
                ? aiDefaultHeightRef
                : collapsedHeight;
        }

        const containerHeight = container.current?.clientHeight ?? 0;

        if (hasAIPanel) {
            allotment.current?.resize([
                containerHeight - problemsHeight.current - aiHeight.current,
                problemsHeight.current,
                aiHeight.current,
            ]);
        } else {
            allotment.current?.resize([
                containerHeight - problemsHeight.current,
                problemsHeight.current,
            ]);
        }
    };

    return (
        <div ref={container} className="size-full">
            <Allotment
                ref={allotment}
                vertical
                onChange={([diff, problems, ai]) => {
                    if (diff === undefined || problems === undefined) {
                        return;
                    }

                    setIsProblemsCollapsed(problems <= collapsedHeight);
                    setIsAICollapsed(ai <= collapsedHeight);

                    problemsHeight.current = problems;
                    aiHeight.current = ai;
                }}
            >
                <Allotment.Pane>
                    <Diff
                        diff={diff || objdiffResult}
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
                    minSize={collapsedHeight}
                    preferredSize={problemsHeight.current}
                >
                    <div className="flex size-full flex-col">
                        <h2 className="flex items-center border-b border-b-gray-5 p-1 pl-3">
                            <GhostButton
                                className="flex w-max grow justify-between text-gray-11"
                                onClick={() => togglePanelCollapsed("problems")}
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

                {hasAIPanel && (
                    <Allotment.Pane
                        minSize={collapsedHeight}
                        preferredSize={aiHeight.current}
                    >
                        <h2 className="flex items-center border-b border-b-gray-5 p-1 pl-3">
                            <GhostButton
                                className="flex w-max grow justify-between text-gray-11"
                                onClick={() => togglePanelCollapsed("ai")}
                            >
                                <span className="font-medium text-sm">AI</span>

                                {isAICollapsed ? (
                                    <ChevronUpIcon />
                                ) : (
                                    <ChevronDownIcon />
                                )}
                            </GhostButton>
                        </h2>

                        <Chat />
                    </Allotment.Pane>
                )}
            </Allotment>
        </div>
    );
}
