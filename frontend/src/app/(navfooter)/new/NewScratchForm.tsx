"use client";

import { useEffect, useState, useMemo, useReducer, useCallback } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import AsyncButton from "@/components/AsyncButton";
import PresetSelect from "@/components/compiler/PresetSelect";
import CodeMirror from "@/components/Editor/CodeMirror";
import PlatformSelect from "@/components/PlatformSelect";
import Select from "@/components/Select2";
import * as api from "@/lib/api";
import { scratchUrl } from "@/lib/api/urls";
import basicSetup from "@/lib/codemirror/basic-setup";
import { cpp } from "@/lib/codemirror/cpp";
import getTranslation from "@/lib/i18n/translate";
import { get } from "@/lib/api/request";
import type { TerseScratch } from "@/lib/api/types";
import { SingleLineScratchItem } from "@/components/ScratchItem";
import { useDebounce } from "use-debounce";
import { useCompilers, usePresets } from "@/lib/api";
import clsx from "clsx";

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

function getLabels(asm: string): string[] {
    const lines = asm.split("\n");
    let labels = [];

    const jtbl_label_regex = /(^L[0-9a-fA-F]{8}$)|(^jtbl_)/;

    for (const line of lines) {
        let match = line.match(/^\s*glabel\s+([A-z0-9_]+)\s*/);
        if (match) {
            labels.push(match[1]);
            continue;
        }
        match = line.match(/^\s*\.global\s+([A-z0-9_]+)\s*/);
        if (match) {
            labels.push(match[1]);
            continue;
        }
        match = line.match(/^[A-z_]+_func_start\s+([A-z0-9_]+)/);
        if (match) {
            labels.push(match[1]);
        }
    }

    labels = labels.filter((label) => !jtbl_label_regex.test(label));

    return labels;
}

export default function NewScratchForm({
    availablePlatforms,
}: {
    availablePlatforms: {
        [id: string]: api.PlatformBase;
    };
}) {
    const [asm, setAsm] = useState("");
    const [context, setContext] = useState("");
    const [platform, setPlatform] = useState<string>();
    const [compilerId, setCompilerId] = useState<string>("");
    const [compilerFlags, setCompilerFlags] = useState<string>("");
    const [diffFlags, setDiffFlags] = useState<string[]>([]);
    const [libraries, setLibraries] = useState<api.Library[]>([]);
    const [presetId, setPresetId] = useState<number | undefined>();

    const [availableCompilers, setAvailableCompilers] = useState<string[]>([]);
    const [availablePresets, setAvailablePresets] = useState<api.Preset[]>();

    const [duplicates, setDuplicates] = useState([]);

    const [ready, setReady] = useState(false);

    const [valueVersion, incrementValueVersion] = useReducer((x) => x + 1, 0);

    const router = useRouter();

    const defaultLabel = useMemo(() => {
        const labels = getLabels(asm);
        return labels.length > 0 ? labels[0] : null;
    }, [asm]);
    const [label, setLabel] = useState<string>("");
    const [debouncedLabel] = useDebounce(label, 1000, {
        leading: false,
        trailing: true,
    });

    const setPreset = useCallback((preset: api.Preset) => {
        if (preset) {
            setPresetId(preset.id);
            setCompilerId(preset.compiler);
            setCompilerFlags(preset.compiler_flags);
            setDiffFlags(preset.diff_flags);
            setLibraries(preset.libraries);
        } else {
            // User selected "Custom", don't change platform or compiler
            setPresetId(undefined);
            setCompilerFlags("");
            setDiffFlags([]);
            setLibraries([]);
        }
    }, []);
    const setCompiler = useCallback((compiler?: string) => {
        setCompilerId(compiler);
        setCompilerFlags("");
        setDiffFlags([]);
        setLibraries([]);
        setPresetId(undefined);
    }, []);

    useEffect(() => {
        if (!ready) return;

        localStorage.new_scratch_label = label;
        localStorage.new_scratch_asm = asm;
        localStorage.new_scratch_context = context;
        localStorage.new_scratch_platform = platform;
        localStorage.new_scratch_compilerId = compilerId;

        if (presetId === undefined) {
            localStorage.removeItem("new_scratch_presetId");
        } else {
            localStorage.new_scratch_presetId = presetId;
        }
    }, [ready, label, asm, context, platform, compilerId, presetId]);

    // 1. Load platform from local storage on initial mount
    useEffect(() => {
        try {
            const storedPlatform = localStorage.getItem("new_scratch_platform");
            const platforms = Object.keys(availablePlatforms);
            if (platforms.includes(storedPlatform)) {
                setPlatform(storedPlatform);
            } else {
                // no local storage, or invalid value, remove it and set first platform
                localStorage.removeItem("new_scratch_platform");
                setPlatform(platforms[0]);
            }

            setLabel(localStorage.new_scratch_label ?? "");
            setAsm(localStorage.new_scratch_asm ?? "");
            setContext(localStorage.new_scratch_context ?? "");
            incrementValueVersion();
        } catch (error) {
            console.warn("bad localStorage", error);
        }
    }, []);

    // 2. Fetch compilers and presets for selected platform
    const compilers = useCompilers(platform);
    const presets = usePresets(platform);
    useEffect(() => {
        if (compilers && typeof presets !== "undefined") {
            setAvailableCompilers(Object.keys(compilers));
            setAvailablePresets(presets);
        } else {
            setAvailableCompilers([]);
            setAvailablePresets(undefined);
        }
    }, [compilers, presets]);

    // 3. Select compiler based on local storage
    useEffect(() => {
        // A platform will always have at least 1 available compiler
        if (availableCompilers.length === 0) return;

        setReady(true);

        const pid = Number.parseInt(localStorage.new_scratch_presetId);
        if (!Number.isNaN(pid)) {
            const preset = availablePresets.filter((x) => x.id === pid)[0];
            if (preset) {
                setPreset(preset);
                return;
            }
        }

        // Remove invalid or missing presetId
        localStorage.removeItem("new_scratch_presetId");

        // Use compilerId from local storage if present and valid
        const cid = localStorage.new_scratch_compilerId ?? "";
        if (availableCompilers.includes(cid)) {
            setCompiler(cid);
        } else {
            console.log(
                `Falling back to first available compiler for ${platform}`,
            );
            setCompiler(availableCompilers[0]);
        }
    }, [platform, availableCompilers, availablePresets]);

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
                target_asm: asm,
                context: context || "",
                platform,
                compiler: compilerId,
                compiler_flags: compilerFlags,
                diff_flags: diffFlags,
                libraries: libraries,
                preset: presetId,
                diff_label: label || defaultLabel || "",
            });

            localStorage.new_scratch_label = "";
            localStorage.new_scratch_asm = "";

            await api.claimScratch(scratch);

            router.push(scratchUrl(scratch));
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    useEffect(() => {
        if (!debouncedLabel) {
            // reset potential duplicates if no diff label
            setDuplicates([]);
            return;
        }

        const filterCandidates = (scratches: TerseScratch[]) => {
            return scratches.filter((scratch: TerseScratch) => {
                // search endpoint is greedy, so only match whole-name
                if (scratch.name !== debouncedLabel) {
                    return false;
                }
                // filter on preset if we have it
                if (typeof presetId !== "undefined") {
                    return scratch.preset === presetId;
                }
                // otherwise filter on platform
                return scratch.platform === platform;
            });
        };

        get(`/scratch?search=${debouncedLabel}`)
            .then((x) => x.results)
            .then(filterCandidates)
            .then(setDuplicates);
    }, [debouncedLabel, platform, presetId]);

    return (
        <div>
            <div>
                <FormLabel>Platform</FormLabel>
                <PlatformSelect
                    platforms={availablePlatforms}
                    value={platform}
                    onChange={(p) => {
                        setPlatform(p);
                        setCompiler("");
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
                                presetId === undefined
                                    ? "text-[color:var(--g700)]"
                                    : "text-[color:var(--g1200)]",
                            )}
                        >
                            Preset
                        </span>
                        <PresetSelect
                            className="w-3/4 sm:w-5/6"
                            presetId={presetId}
                            setPreset={setPreset}
                            availablePresets={availablePresets}
                        />
                    </div>

                    <div className="py-2" />

                    <div className="flex w-full flex-row items-center">
                        <span
                            className={clsx(
                                "w-1/4 select-none px-2.5 py-0.5 text-[0.8rem] sm:w-1/6",
                                presetId === undefined
                                    ? "text-[color:var(--g1200)]"
                                    : "text-[color:var(--g700)]",
                            )}
                        >
                            Compiler
                        </span>
                        <Select
                            className="w-3/4 sm:w-5/6"
                            options={compilerChoiceOptions}
                            value={compilerId}
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
                    value={label}
                    placeholder={defaultLabel}
                    onChange={(e) =>
                        setLabel((e.target as HTMLInputElement).value)
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
                    value={asm}
                    valueVersion={valueVersion}
                    onChange={setAsm}
                    extensions={basicSetup}
                    placeholder="Place your GNU assembler compatible assembly here."
                />
            </div>
            <div className="flex h-[200px] flex-col">
                <FormLabel small="(optional)">Context</FormLabel>
                <CodeMirror
                    className="w-full flex-1 overflow-hidden rounded border border-[color:var(--g500)] bg-[color:var(--g200)] [&_.cm-editor]:h-full"
                    value={context}
                    valueVersion={valueVersion}
                    onChange={setContext}
                    extensions={[basicSetup, cpp()]}
                    placeholder="Add any typedefs, structs, and declarations here."
                />
            </div>

            <div>
                <AsyncButton
                    primary
                    disabled={asm.length === 0}
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
