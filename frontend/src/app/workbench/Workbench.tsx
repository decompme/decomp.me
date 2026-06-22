"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
} from "react";

import type { Extension } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { Allotment } from "allotment";
import { XIcon } from "@primer/octicons-react";
import Link from "@/components/Link";
import { PlatformIcon } from "@/components/PlatformSelect/PlatformIcon";
import { useSearchParams } from "next/navigation";
import { cpp } from "@/lib/codemirror/cpp";
import basicSetup from "@/lib/codemirror/basic-setup";
import * as api from "@/lib/api";
import { scratchUrl } from "@/lib/api/urls";

import CodeMirror from "@/components/Editor/CodeMirror";
import CompilerOpts from "@/components/compiler/CompilerOpts";
import CompilationPanel from "@/components/Diff/CompilationPanel";
import ScoreBadge from "@/components/ScoreBadge";
import { ScrollContext } from "@/components/ScrollContext";
import {
    SelectedSourceLineProvider,
    useSelectedSourceLine,
} from "@/components/SelectedSourceLineContext";
import Tabs, { Tab } from "@/components/Tabs";

type Target = {
    id: string;
    scratch: api.Scratch;
    targetObject: string;
    compilation: api.Compilation | null;
    isCompiling: boolean;
    error: string | null;
};

function targetCompileKey(target: Target) {
    const scratch = target.scratch;

    return {
        id: target.id,
        targetObject: target.targetObject,
        platform: scratch.platform,
        compiler: scratch.compiler,
        compiler_flags: scratch.compiler_flags,
        diff_flags: scratch.diff_flags,
        diff_label: scratch.diff_label,
        libraries: scratch.libraries,
    };
}

function mergeCompilerOutput(...parts: Array<string | null | undefined>) {
    return parts.filter(Boolean).join("\n");
}

function TargetCard({
    target,
    onChange,
    onRemove,
}: {
    target: Target;
    onChange: (scratch: Partial<api.Scratch>) => void;
    onRemove: () => void;
}) {
    const perSaveObj = useRef({}).current;
    const compilation = target.compilation;
    const [activeTab, setActiveTab] = useState<"diff" | "options">("diff");
    const scoreBadge = compilation?.diff_output ? (
        <ScoreBadge
            score={compilation.diff_output.current_score}
            maxScore={compilation.diff_output.max_score}
            matchOverride={target.scratch.match_override}
            compiledSuccessfully={compilation.success}
        />
    ) : null;

    return (
        <section className="flex size-full min-h-0 flex-col overflow-hidden bg-gray-2">
            <header className="flex items-center gap-2 border-gray-6 border-b px-2 py-0.5">
                <div className="min-w-0 grow">
                    <div className="flex items-center gap-2">
                        <PlatformIcon
                            platform={target.scratch.platform}
                            size={18}
                            className="shrink-0"
                        />
                        <h2 className="truncate font-medium text-sm">
                            {target.scratch.name || target.scratch.slug}
                            <Link
                                href={scratchUrl(target.scratch)}
                                className="ml-1 font-mono text-accent-11 text-xs hover:text-accent-12 hover:underline"
                            >
                                {target.scratch.slug}
                            </Link>
                        </h2>
                    </div>
                </div>
                <button
                    type="button"
                    aria-label={`Remove ${target.scratch.slug}`}
                    title="Remove"
                    className="inline-flex size-6 shrink-0 items-center justify-center rounded border border-gray-7 text-gray-11 hover:border-red-7 hover:bg-red-3 hover:text-red-11"
                    onClick={() => {
                        if (
                            window.confirm(
                                `Remove ${target.scratch.name || target.scratch.slug} from the workbench?`,
                            )
                        ) {
                            onRemove();
                        }
                    }}
                >
                    <XIcon size={14} />
                </button>
            </header>

            {target.error && (
                <p className="border-red-6 border-b bg-red-3 px-2 py-1 text-red-11 text-sm">
                    {target.error}
                </p>
            )}

            <Tabs
                className="min-h-0 grow"
                activeTab={activeTab}
                onChange={(tab) => setActiveTab(tab as "diff" | "options")}
            >
                <Tab
                    tabKey="diff"
                    label={
                        <>
                            Diff
                            {scoreBadge}
                        </>
                    }
                    className="min-h-0"
                >
                    {compilation ? (
                        <CompilationPanel
                            scratch={target.scratch}
                            compilation={compilation}
                            isCompiling={target.isCompiling}
                            isCompilationOld={false}
                            perSaveObj={perSaveObj}
                            showProblems
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center p-6 text-center text-gray-11 text-sm">
                            Load complete. Waiting for the first compile.
                        </div>
                    )}
                </Tab>
                <Tab tabKey="options" label="Options" className="min-h-0">
                    <div className="size-full min-h-0 overflow-auto p-2">
                        <CompilerOpts
                            platform={target.scratch.platform}
                            value={target.scratch}
                            onChange={onChange}
                            diffLabel={target.scratch.diff_label}
                            onDiffLabelChange={(diff_label) =>
                                onChange({ diff_label })
                            }
                            matchOverride={target.scratch.match_override}
                            onMatchOverrideChange={(match_override) =>
                                onChange({ match_override })
                            }
                        />
                    </div>
                </Tab>
            </Tabs>
        </section>
    );
}

function EditorPanel({
    addTargetForm,
    activeEditor,
    setActiveEditor,
    sourceCode,
    setSourceCode,
    context,
    setContext,
    valueVersion,
    editorExtensions,
    sourceEditor,
}: {
    addTargetForm: React.ReactNode;
    activeEditor: "source" | "context";
    setActiveEditor: (activeEditor: "source" | "context") => void;
    sourceCode: string;
    setSourceCode: (sourceCode: string) => void;
    context: string;
    setContext: (context: string) => void;
    valueVersion: number;
    editorExtensions: Extension;
    sourceEditor: React.RefObject<EditorView | null>;
}) {
    const { setSelectedSourceLine } = useSelectedSourceLine();

    return (
        <section className="flex size-full min-h-0 flex-col overflow-hidden bg-gray-2">
            <header className="flex items-center gap-2 border-gray-6 border-b px-2 py-0.5">
                <div className="min-w-0 grow">
                    <h2 className="truncate font-medium text-sm">
                        Multi-Scratch Workspace
                    </h2>
                </div>
                {addTargetForm}
            </header>

            <Tabs
                className="min-h-0 grow"
                activeTab={activeEditor}
                onChange={(tab) => setActiveEditor(tab as "source" | "context")}
            >
                <Tab
                    tabKey="source"
                    label="Source code"
                    className="flex min-h-0 grow flex-col [&_.cm-editor]:h-full [&_.cm-editor]:min-h-0 [&_.cm-scroller]:h-full [&_.cm-scroller]:overflow-auto"
                >
                    <CodeMirror
                        viewRef={sourceEditor}
                        className="min-h-0 grow"
                        value={sourceCode}
                        valueVersion={valueVersion}
                        onChange={setSourceCode}
                        onSelectedLineChange={setSelectedSourceLine}
                        extensions={editorExtensions}
                        placeholder="Load a scratch or write source code here."
                    />
                </Tab>
                <Tab
                    tabKey="context"
                    label="Context"
                    className="flex min-h-0 grow flex-col [&_.cm-editor]:h-full [&_.cm-editor]:min-h-0 [&_.cm-scroller]:h-full [&_.cm-scroller]:overflow-auto"
                >
                    <CodeMirror
                        className="min-h-0 grow"
                        value={context}
                        valueVersion={valueVersion}
                        onChange={setContext}
                        extensions={editorExtensions}
                        placeholder="Shared typedefs, structs, and declarations."
                    />
                </Tab>
            </Tabs>
        </section>
    );
}

function WorkbenchInner() {
    const searchParams = useSearchParams();
    const [slug, setSlug] = useState("");
    const [targets, setTargets] = useState<Target[]>([]);
    const [sourceCode, setSourceCode] = useState("");
    const [context, setContext] = useState("");
    const [activeEditor, setActiveEditor] = useState<"source" | "context">(
        "source",
    );
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [valueVersion, incrementValueVersion] = useReducer((x) => x + 1, 0);
    const compileRunRef = useRef(0);
    const sourceEditor = useRef<EditorView>(null);
    const preloadedTargets = useRef(false);
    const targetsRef = useRef(targets);
    const sourceCodeRef = useRef(sourceCode);
    const contextRef = useRef(context);

    useEffect(() => {
        targetsRef.current = targets;
    }, [targets]);
    useEffect(() => {
        sourceCodeRef.current = sourceCode;
    }, [sourceCode]);
    useEffect(() => {
        contextRef.current = context;
    }, [context]);

    const editorExtensions = useMemo(() => [basicSetup, cpp()], []);

    const updateTarget = useCallback(
        (id: string, partial: Partial<api.Scratch>) => {
            setTargets((targets) =>
                targets.map((target) =>
                    target.id === id
                        ? {
                              ...target,
                              scratch: { ...target.scratch, ...partial },
                          }
                        : target,
                ),
            );
        },
        [],
    );

    const compileTargets = useCallback(async (ids?: string[]) => {
        const runId = ++compileRunRef.current;
        const selectedTargets = targetsRef.current.filter(
            (target) => !ids || ids.includes(target.id),
        );
        if (!selectedTargets.length) return;

        setTargets((targets) =>
            targets.map((target) =>
                selectedTargets.some((selected) => selected.id === target.id)
                    ? { ...target, isCompiling: true, error: null }
                    : target,
            ),
        );

        await Promise.all(
            selectedTargets.map(async (target) => {
                try {
                    const scratch = target.scratch;
                    const compileResult: api.StatelessCompileResult =
                        await api.post("/compile", {
                            compiler_id: scratch.compiler,
                            compiler_flags: scratch.compiler_flags,
                            code: sourceCodeRef.current,
                            context: contextRef.current,
                            function: scratch.diff_label,
                            libraries: scratch.libraries,
                        });

                    const diffResult: api.StatelessDiffResult = await api.post(
                        "/diff",
                        {
                            platform_id: scratch.platform,
                            diff_label: scratch.diff_label,
                            diff_flags: scratch.diff_flags,
                            target_elf: target.targetObject,
                            compiled_elf: compileResult.elf_object,
                            include_objects: false,
                        },
                    );

                    if (runId !== compileRunRef.current) return;

                    const compilation: api.Compilation = {
                        compiler_output: mergeCompilerOutput(
                            compileResult.errors,
                            diffResult.errors,
                        ),
                        diff_output: diffResult.result,
                        left_object: null,
                        right_object: compileResult.elf_object,
                        success: compileResult.success && diffResult.success,
                    };

                    setTargets((targets) =>
                        targets.map((current) =>
                            current.id === target.id
                                ? {
                                      ...current,
                                      compilation,
                                      isCompiling: false,
                                      error: null,
                                  }
                                : current,
                        ),
                    );
                } catch (error) {
                    if (runId !== compileRunRef.current) return;

                    setTargets((targets) =>
                        targets.map((current) =>
                            current.id === target.id
                                ? {
                                      ...current,
                                      isCompiling: false,
                                      error:
                                          error instanceof Error
                                              ? error.message
                                              : "Compile failed",
                                  }
                                : current,
                        ),
                    );
                }
            }),
        );
    }, []);

    const compileInputKey = useMemo(
        () =>
            JSON.stringify({
                sourceCode,
                context,
                targets: targets.map(targetCompileKey),
            }),
        [sourceCode, context, targets],
    );

    useEffect(() => {
        if (!targets.length) return;

        const timeout = setTimeout(() => {
            void compileTargets();
        }, 700);

        return () => clearTimeout(timeout);
    }, [compileInputKey]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadTarget = useCallback(
        async (targetSlug: string): Promise<Target> => {
            const scratch: api.Scratch = await api.get(
                `/scratch/${targetSlug}`,
            );
            const bootstrap: api.Compilation = await api.post(
                `${scratchUrl(scratch)}/compile`,
                api.buildScratchCompileRequest(scratch, scratch),
            );

            const targetObject = bootstrap.left_object;
            if (!targetObject) {
                throw new Error(
                    "Scratch compile did not return a target object.",
                );
            }

            return {
                id: scratch.slug,
                scratch,
                targetObject,
                compilation: null,
                isCompiling: false,
                error: null,
            };
        },
        [],
    );

    const addTarget = useCallback(
        async (targetSlug = slug) => {
            const trimmedSlug = targetSlug.trim();
            if (!trimmedSlug || isLoading) return;
            if (
                targetsRef.current.some(
                    (target) => target.scratch.slug === trimmedSlug,
                )
            ) {
                setLoadError("That scratch is already loaded.");
                return;
            }

            setIsLoading(true);
            setLoadError(null);

            try {
                const target = await loadTarget(trimmedSlug);
                const isFirstTarget = targetsRef.current.length === 0;
                setTargets((targets) => {
                    const nextTargets = [...targets, target];
                    targetsRef.current = nextTargets;
                    return nextTargets;
                });

                if (isFirstTarget) {
                    setSourceCode(target.scratch.source_code);
                    setContext(target.scratch.context);
                    incrementValueVersion();
                }

                setSlug("");
            } catch (error) {
                setLoadError(
                    error instanceof Error
                        ? error.message
                        : "Failed to load scratch.",
                );
            } finally {
                setIsLoading(false);
            }
        },
        [isLoading, loadTarget, slug],
    );

    useEffect(() => {
        if (preloadedTargets.current) return;
        preloadedTargets.current = true;

        const targetsParam = searchParams.get("targets");
        if (!targetsParam) return;

        const targetSlugs = targetsParam
            .split(",")
            .map((target) => target.trim())
            .filter(Boolean)
            .filter(
                (target, index, targets) => targets.indexOf(target) === index,
            )
            .filter(
                (target) =>
                    !targetsRef.current.some(
                        (current) => current.scratch.slug === target,
                    ),
            );
        if (!targetSlugs.length) return;

        setIsLoading(true);
        setLoadError(null);

        void (async () => {
            const results = await Promise.allSettled(
                targetSlugs.map((target) => loadTarget(target)),
            );
            const loadedTargets: Target[] = [];
            const failedTargets: string[] = [];

            for (const [index, result] of results.entries()) {
                if (result.status === "fulfilled") {
                    loadedTargets.push(result.value);
                } else {
                    failedTargets.push(targetSlugs[index]);
                }
            }

            if (loadedTargets.length) {
                const isFirstTarget = targetsRef.current.length === 0;
                setTargets((targets) => {
                    const existingSlugs = new Set(
                        targets.map((target) => target.scratch.slug),
                    );
                    const nextTargets = [
                        ...targets,
                        ...loadedTargets.filter(
                            (target) => !existingSlugs.has(target.scratch.slug),
                        ),
                    ];
                    targetsRef.current = nextTargets;
                    return nextTargets;
                });

                if (isFirstTarget) {
                    setSourceCode(loadedTargets[0].scratch.source_code);
                    setContext(loadedTargets[0].scratch.context);
                    incrementValueVersion();
                }
            }

            if (failedTargets.length) {
                setLoadError(`Failed to load: ${failedTargets.join(", ")}`);
            }

            setIsLoading(false);
        })();
    }, [loadTarget, searchParams]);

    const addTargetForm = (
        <form
            className="flex h-6 shrink-0 overflow-hidden rounded border border-gray-7 bg-gray-1 shadow-sm focus-within:border-accent-8"
            onSubmit={(event) => {
                event.preventDefault();
                void addTarget();
            }}
        >
            <input
                className="w-28 border-0 bg-transparent px-2 text-sm outline-none placeholder:text-gray-9"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="Enter slug id"
                aria-label="Scratch slug"
            />
            <button
                type="submit"
                disabled={isLoading}
                className="border-gray-7 border-l bg-gray-3 px-2 font-medium text-accent-11 text-sm hover:bg-accent-3 hover:text-accent-12 disabled:cursor-not-allowed disabled:opacity-60"
            >
                Add
            </button>
        </form>
    );

    return (
        <main className="flex h-dvh min-h-0 grow flex-col gap-1 overflow-hidden px-1 pt-1 pb-0">
            {loadError && (
                <p className="shrink-0 rounded border border-red-7 bg-red-3 px-2 py-1 text-red-11 text-sm">
                    {loadError}
                </p>
            )}

            <div className="min-h-0 grow">
                <Allotment defaultSizes={[42, 58]}>
                    <Allotment.Pane minSize={260}>
                        <div className="size-full min-h-0">
                            <EditorPanel
                                addTargetForm={addTargetForm}
                                activeEditor={activeEditor}
                                setActiveEditor={setActiveEditor}
                                sourceCode={sourceCode}
                                setSourceCode={setSourceCode}
                                context={context}
                                setContext={setContext}
                                valueVersion={valueVersion}
                                editorExtensions={editorExtensions}
                                sourceEditor={sourceEditor}
                            />
                        </div>
                    </Allotment.Pane>

                    <Allotment.Pane minSize={320}>
                        <ScrollContext.Provider value={sourceEditor}>
                            <section className="size-full min-h-0">
                                {targets.length ? (
                                    <Allotment>
                                        {targets.map((target) => (
                                            <Allotment.Pane
                                                key={target.id}
                                                minSize={360}
                                            >
                                                <div className="size-full min-h-0">
                                                    <TargetCard
                                                        target={target}
                                                        onChange={(partial) =>
                                                            updateTarget(
                                                                target.id,
                                                                partial,
                                                            )
                                                        }
                                                        onRemove={() =>
                                                            setTargets(
                                                                (targets) =>
                                                                    targets.filter(
                                                                        (
                                                                            current,
                                                                        ) =>
                                                                            current.id !==
                                                                            target.id,
                                                                    ),
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </Allotment.Pane>
                                        ))}
                                    </Allotment>
                                ) : (
                                    <section className="flex size-full items-center justify-center rounded border border-gray-7 border-dashed p-6 text-center text-gray-11">
                                        Add a scratch slug to start comparing
                                        targets.
                                    </section>
                                )}
                            </section>
                        </ScrollContext.Provider>
                    </Allotment.Pane>
                </Allotment>
            </div>
        </main>
    );
}

export default function Workbench() {
    return (
        <SelectedSourceLineProvider>
            <WorkbenchInner />
        </SelectedSourceLineProvider>
    );
}
