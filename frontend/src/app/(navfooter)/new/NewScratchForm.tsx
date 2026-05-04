"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import clsx from "clsx";
import { useDebounce } from "use-debounce";

import AsyncButton from "@/components/AsyncButton";
import PresetSelect from "@/components/compiler/PresetSelect";
import CodeMirror from "@/components/Editor/CodeMirror";
import PlatformSelect from "@/components/PlatformSelect";
import Select from "@/components/Select2";
import { SingleLineScratchItem } from "@/components/ScratchItem";
import * as api from "@/lib/api";
import { useCompilers, usePresets } from "@/lib/api";
import { get } from "@/lib/api/request";
import { scratchUrl } from "@/lib/api/urls";
import type { TerseScratch } from "@/lib/api/types";
import basicSetup from "@/lib/codemirror/basic-setup";
import { cpp } from "@/lib/codemirror/cpp";
import getTranslation from "@/lib/i18n/translate";

import {
    applyCompiler,
    applyPreset,
    clearSubmittedDraft,
    emptyDraft,
    filterDuplicateScratches,
    getLabels,
    readStoredDraft,
    selectDraftCompiler,
    storedDraftFields,
    writeStoredDraft,
    type NewScratchDraft,
} from "./NewScratchForm.state";

interface FormLabelProps {
    children: React.ReactNode;
    htmlel?: string;
    small?: string;
}

function FormLabel({ children, htmlel, small }: FormLabelProps) {
    const Tag = htmlel ? "label" : "p";
    return (
        <Tag
            className="m-0 block select-none py-2.5 font-semibold text-[0.9em] text-[color:var(--g1700)]"
            {...(htmlel && { htmlel })}
        >
            {children}
            {small && (
                <small className="pl-2 font-normal text-[0.8em] text-[color:var(--g800)]">
                    {small}
                </small>
            )}
        </Tag>
    );
}

function useDuplicateScratches(
    label: string,
    platform?: string,
    presetId?: number,
) {
    const [debouncedLabel] = useDebounce(label, 1000, {
        leading: false,
        trailing: true,
    });
    const [duplicates, setDuplicates] = useState<TerseScratch[]>([]);

    useEffect(() => {
        if (!debouncedLabel) {
            setDuplicates([]);
            return;
        }

        let isCurrent = true;
        const search = encodeURIComponent(debouncedLabel);

        get(`/scratch?search=${search}`)
            .then((x) => x.results)
            .then((scratches) =>
                filterDuplicateScratches(
                    scratches,
                    debouncedLabel,
                    platform,
                    presetId,
                ),
            )
            .then((duplicates) => {
                if (isCurrent) {
                    setDuplicates(duplicates);
                }
            });

        return () => {
            isCurrent = false;
        };
    }, [debouncedLabel, platform, presetId]);

    return duplicates;
}

export default function NewScratchForm({
    availablePlatforms,
}: {
    availablePlatforms: {
        [id: string]: api.PlatformBase;
    };
}) {
    const [draft, setDraft] = useState<NewScratchDraft>(emptyDraft);
    const hasLoadedStoredDraft = useRef(false);
    const initializedPlatform = useRef<string | undefined>(undefined);

    const [valueVersion, incrementValueVersion] = useReducer((x) => x + 1, 0);

    const router = useRouter();

    const defaultLabel = useMemo(() => {
        const labels = getLabels(draft.asm);
        return labels.length > 0 ? labels[0] : null;
    }, [draft.asm]);
    const duplicates = useDuplicateScratches(
        draft.label,
        draft.platform,
        draft.presetId,
    );

    const setPreset = useCallback((preset: api.Preset) => {
        setDraft((draft) => applyPreset(draft, preset));
    }, []);
    const setCompiler = useCallback((compiler?: string) => {
        setDraft((draft) => applyCompiler(draft, compiler));
    }, []);

    useEffect(() => {
        if (hasLoadedStoredDraft.current) {
            writeStoredDraft(localStorage, storedDraftFields(draft));
        }
    }, [
        draft.label,
        draft.asm,
        draft.context,
        draft.platform,
        draft.compilerId,
        draft.presetId,
    ]);

    useEffect(() => {
        if (hasLoadedStoredDraft.current) return;

        try {
            const storedDraft = readStoredDraft(
                localStorage,
                Object.keys(availablePlatforms),
            );
            setDraft((draft) => ({ ...draft, ...storedDraft }));
            hasLoadedStoredDraft.current = true;
            incrementValueVersion();
        } catch (error) {
            console.warn("bad localStorage", error);
        }
    }, [availablePlatforms]);

    const compilers = useCompilers(draft.platform);
    const presets = usePresets(draft.platform);
    const availableCompilers = useMemo(
        () => Object.keys(compilers),
        [compilers],
    );
    const availablePresets = presets;

    useEffect(() => {
        // A platform must have at least one compiler to exist on the site.
        // So an empty compiler list means the API result is still pending.
        if (
            availableCompilers.length === 0 ||
            typeof availablePresets === "undefined"
        ) {
            return;
        }

        if (initializedPlatform.current === draft.platform) {
            return;
        }

        initializedPlatform.current = draft.platform;
        setDraft((draft) =>
            selectDraftCompiler(draft, availableCompilers, availablePresets),
        );
    }, [availableCompilers, availablePresets, draft.platform]);

    const compilersTranslation = getTranslation("compilers");
    const compilerChoiceOptions = useMemo(() => {
        if (availableCompilers.length === 0) {
            return { "": "Loading..." };
        }
        return availableCompilers.reduce(
            (sum, id) => {
                sum[id] = compilersTranslation.t(id);
                return sum;
            },
            {} as Record<string, string>,
        );
    }, [availableCompilers, compilersTranslation]);

    const submit = async () => {
        try {
            const scratch: api.ClaimableScratch = await api.post("/scratch", {
                target_asm: draft.asm,
                context: draft.context || "",
                platform: draft.platform,
                compiler: draft.compilerId,
                compiler_flags: draft.compilerFlags,
                diff_flags: draft.diffFlags,
                libraries: draft.libraries,
                preset: draft.presetId,
                diff_label: draft.label || defaultLabel || "",
            });

            clearSubmittedDraft(localStorage);

            await api.claimScratch(scratch);

            router.push(scratchUrl(scratch));
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    return (
        <div>
            <div>
                <FormLabel>Platform</FormLabel>
                <PlatformSelect
                    platforms={availablePlatforms}
                    value={draft.platform}
                    onChange={(p) => {
                        setDraft((draft) =>
                            applyCompiler({ ...draft, platform: p }, ""),
                        );
                    }}
                />
            </div>

            <div>
                <FormLabel small="(a preset combines a compiler with compiler flags)">
                    Preset or Compiler
                </FormLabel>
                <div className="flex flex-col justify-between gap-0">
                    <div className="flex w-full flex-row items-center">
                        <span
                            className={clsx(
                                "w-1/4 select-none px-2.5 py-0.5 text-[0.8rem] sm:w-1/6",
                                draft.presetId === undefined
                                    ? "text-[color:var(--g700)]"
                                    : "text-[color:var(--g1200)]",
                            )}
                        >
                            Preset
                        </span>
                        <PresetSelect
                            className="w-3/4 sm:w-5/6"
                            presetId={draft.presetId}
                            setPreset={setPreset}
                            availablePresets={availablePresets}
                        />
                    </div>

                    <div className="py-2" />

                    <div className="flex w-full flex-row items-center">
                        <span
                            className={clsx(
                                "w-1/4 select-none px-2.5 py-0.5 text-[0.8rem] sm:w-1/6",
                                draft.presetId === undefined
                                    ? "text-[color:var(--g1200)]"
                                    : "text-[color:var(--g700)]",
                            )}
                        >
                            Compiler
                        </span>
                        <Select
                            className="w-3/4 sm:w-5/6"
                            options={compilerChoiceOptions}
                            value={draft.compilerId}
                            onChange={setCompiler}
                        />
                    </div>
                </div>
            </div>

            <div>
                <FormLabel
                    htmlel="label"
                    small="(asm label from which the diff will begin)"
                >
                    Diff label
                </FormLabel>
                <input
                    name="label"
                    type="text"
                    value={draft.label}
                    placeholder={defaultLabel}
                    onChange={(e) =>
                        setDraft((draft) => ({
                            ...draft,
                            label: (e.target as HTMLInputElement).value,
                        }))
                    }
                    className="w-full rounded border border-[color:var(--g500)] bg-[color:var(--g200)] px-2.5 py-2 font-mono text-[0.8rem] text-[color:var(--g1200)] placeholder-[color:var(--g700)] outline-none"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                />
            </div>

            {duplicates.length > 0 && (
                <div className="px-2.5 py-2 text-sm">
                    <p>
                        The following scratches have been found that share this
                        name:
                    </p>
                    <div className="pl-2.5">
                        {duplicates.map((scratch) => (
                            <SingleLineScratchItem
                                key={scratchUrl(scratch)}
                                scratch={scratch}
                                showOwner={true}
                            />
                        ))}
                    </div>
                </div>
            )}
            <div className="flex h-[200px] flex-col">
                <FormLabel small="(required)">Target assembly</FormLabel>
                <CodeMirror
                    className="w-full flex-1 overflow-hidden rounded border border-[color:var(--g500)] bg-[color:var(--g200)] [&_.cm-editor]:h-full"
                    value={draft.asm}
                    valueVersion={valueVersion}
                    onChange={(asm) => setDraft((draft) => ({ ...draft, asm }))}
                    extensions={basicSetup}
                    placeholder="Place your GAS-compatible assembly code here."
                />
            </div>
            <div className="flex h-[200px] flex-col">
                <FormLabel small="(optional)">Context</FormLabel>
                <CodeMirror
                    className="w-full flex-1 overflow-hidden rounded border border-[color:var(--g500)] bg-[color:var(--g200)] [&_.cm-editor]:h-full"
                    value={draft.context}
                    valueVersion={valueVersion}
                    onChange={(context) =>
                        setDraft((draft) => ({ ...draft, context }))
                    }
                    extensions={[basicSetup, cpp()]}
                    placeholder="Add any typedefs, structs, and declarations here."
                />
            </div>

            <div>
                <AsyncButton
                    primary
                    disabled={draft.asm.length === 0}
                    onClick={submit}
                    errorPlacement="right-center"
                    className="mt-2"
                >
                    Create scratch
                </AsyncButton>
                <p className="pt-4 text-[0.9rem] text-[color:var(--g1200)]">
                    decomp.me will store any data you submit and link it to your
                    session.
                    <br />
                    For more information, see our{" "}
                    <Link
                        href="/privacy"
                        className="text-[color:var(--link)] hover:underline"
                    >
                        privacy policy
                    </Link>
                    .
                </p>
            </div>
        </div>
    );
}
