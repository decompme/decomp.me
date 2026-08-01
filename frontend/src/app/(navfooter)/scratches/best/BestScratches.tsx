"use client";

import { useEffect, useMemo, useState } from "react";

import { usePathname, useRouter } from "next/navigation";

import { useDebounce } from "use-debounce";

import AsyncButton from "@/components/AsyncButton";
import Link from "@/components/Link";
import { percentToString } from "@/components/ScoreBadge";
import Select from "@/components/Select2";
import TimeAgo from "@/components/TimeAgo";
import UserLink from "@/components/user/UserLink";
import { usePaginated, usePresets } from "@/lib/api";
import type {
    BestByNameCandidate,
    BestByNameGroup,
    PlatformBase,
} from "@/lib/api/types";

import {
    DEFAULT_DEPTH,
    DEFAULT_ORDERING,
    DEPTH_OPTIONS,
    ORDERING_OPTIONS,
    apiFractionToPercentString,
    percentStringToApiFraction,
    resolveDefaultPlatform,
    selectPresetId,
} from "./BestScratches.state";

function platformsToOptions(platforms: Record<string, PlatformBase>) {
    const options: Record<string, string> = {};
    for (const [id, platform] of Object.entries(platforms)) {
        options[id] = platform.name;
    }
    return options;
}

function CandidateRow({ candidate }: { candidate: BestByNameCandidate }) {
    return (
        <li className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1 pl-6 text-sm">
            <span className="w-6 shrink-0 text-gray-11 tabular-nums">
                #{candidate.rank}
            </span>
            <Link
                href={`/scratch/${candidate.slug}`}
                className="font-medium hover:text-[var(--link)]"
            >
                {percentToString(candidate.match_percent * 100)} matched
            </Link>
            <span className="flex items-center gap-1 text-gray-11">
                {candidate.owner ? (
                    <UserLink user={candidate.owner} truncateUsername={false} />
                ) : (
                    <span>No owner</span>
                )}
                <span>•</span>
                <TimeAgo date={candidate.last_updated} />
            </span>
        </li>
    );
}

function GroupRow({ group }: { group: BestByNameGroup }) {
    if (group.scratches.length === 0) {
        return null;
    }

    return (
        <li className="rounded-md border border-gray-6 py-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3">
                <span className="font-mono font-semibold">{group.name}</span>
                <span className="text-gray-11 text-sm">
                    {percentToString(group.best_match_percent * 100)} best
                </span>
                <span className="text-gray-11 text-sm">
                    updated <TimeAgo date={group.latest_activity} />
                </span>
            </div>
            <ul className="mt-1">
                {group.scratches.map((candidate) => (
                    <CandidateRow key={candidate.slug} candidate={candidate} />
                ))}
            </ul>
        </li>
    );
}

function GroupList({ url }: { url: string }) {
    const { results, isLoading, hasNext, loadNext } =
        usePaginated<BestByNameGroup>(url, { isPublic: true });

    return (
        <ul className="flex flex-col gap-2" aria-busy={isLoading}>
            {results.map((group) => (
                <GroupRow key={group.name} group={group} />
            ))}
            {results.length === 0 && !isLoading && (
                <li className="py-4 text-center text-gray-11 text-sm">
                    No scratches match these filters.
                </li>
            )}
            {hasNext && (
                <li className="flex justify-center pt-2">
                    <AsyncButton onClick={loadNext}>
                        Show more functions
                    </AsyncButton>
                </li>
            )}
        </ul>
    );
}

export default function BestScratches({
    availablePlatforms,
    initialPlatform,
    initialPreset,
    initialDepth,
    initialOrdering,
    initialMinMatch,
    initialSearch,
}: {
    availablePlatforms: Record<string, PlatformBase>;
    initialPlatform?: string;
    initialPreset?: number;
    initialDepth?: string;
    initialOrdering?: string;
    initialMinMatch?: string;
    initialSearch?: string;
}) {
    const router = useRouter();
    const pathname = usePathname();

    const platformOptions = useMemo(
        () => platformsToOptions(availablePlatforms),
        [availablePlatforms],
    );

    const [platform, setPlatform] = useState(
        () => resolveDefaultPlatform(availablePlatforms, initialPlatform) ?? "",
    );
    const presets = usePresets(platform);
    const [presetId, setPresetId] = useState<number | null>(
        initialPreset ?? null,
    );
    const [depth, setDepth] = useState(initialDepth ?? DEFAULT_DEPTH);
    const [ordering, setOrdering] = useState(
        initialOrdering ?? DEFAULT_ORDERING,
    );
    const [minMatch, setMinMatch] = useState(initialMinMatch ?? "");
    const [search, setSearch] = useState(initialSearch ?? "");
    const [debouncedSearch] = useDebounce(search, 300);

    useEffect(() => {
        setPresetId((currentPresetId) =>
            selectPresetId(presets, currentPresetId),
        );
    }, [presets]);

    const minMatchFraction = percentStringToApiFraction(minMatch);

    useEffect(() => {
        if (!presetId) {
            return;
        }
        const params = new URLSearchParams();
        params.set("platform", platform);
        params.set("preset", String(presetId));
        if (depth !== DEFAULT_DEPTH) {
            params.set("depth", depth);
        }
        if (ordering !== DEFAULT_ORDERING) {
            params.set("ordering", ordering);
        }
        if (minMatchFraction !== undefined) {
            params.set("min_match", minMatchFraction);
        }
        if (debouncedSearch.trim()) {
            params.set("search", debouncedSearch.trim());
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [
        platform,
        presetId,
        depth,
        ordering,
        minMatchFraction,
        debouncedSearch,
        pathname,
        router,
    ]);

    const presetOptions = useMemo(() => {
        const options: Record<string, string> = {};
        for (const preset of presets ?? []) {
            options[String(preset.id)] = preset.name;
        }
        return options;
    }, [presets]);

    const url = useMemo(() => {
        if (!presetId) {
            return null;
        }

        const params = new URLSearchParams({
            platform,
            preset: String(presetId),
            depth,
            ordering,
            page_size: "25",
        });
        const trimmedSearch = debouncedSearch.trim();
        if (trimmedSearch) {
            params.set("search", trimmedSearch);
        }
        if (minMatchFraction !== undefined) {
            params.set("min_match", minMatchFraction);
        }

        return `/scratch/best-by-name?${params.toString()}`;
    }, [
        platform,
        presetId,
        depth,
        ordering,
        debouncedSearch,
        minMatchFraction,
    ]);

    return (
        <section>
            <div className="flex flex-wrap items-end gap-3 pb-4">
                <label className="flex flex-col gap-1 text-gray-11 text-xs">
                    <span>Platform</span>
                    <Select
                        value={platform}
                        onChange={(value) => {
                            setPlatform(value);
                            setPresetId(null);
                        }}
                        options={platformOptions}
                    />
                </label>
                <label className="flex flex-col gap-1 text-gray-11 text-xs">
                    <span>Preset</span>
                    <Select
                        value={presetId ? String(presetId) : ""}
                        onChange={(value) => {
                            if (value) {
                                setPresetId(Number(value));
                            }
                        }}
                        options={
                            Object.keys(presetOptions).length > 0
                                ? presetOptions
                                : { "": "No presets for this platform" }
                        }
                    />
                </label>
                <label className="flex flex-col gap-1 text-gray-11 text-xs">
                    <span>Depth</span>
                    <Select
                        value={depth}
                        onChange={setDepth}
                        options={DEPTH_OPTIONS}
                    />
                </label>
                <label className="flex flex-col gap-1 text-gray-11 text-xs">
                    <span>Sort</span>
                    <Select
                        value={ordering}
                        onChange={setOrdering}
                        options={ORDERING_OPTIONS}
                    />
                </label>
                <label className="flex flex-col gap-1 text-gray-11 text-xs">
                    <span>Min match %</span>
                    <input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="Any"
                        className="w-20 rounded border border-[var(--g400)] bg-[var(--g200)] px-[10px] py-2 text-[0.8rem] text-[var(--g1600)]"
                        value={minMatch}
                        onChange={(event) => setMinMatch(event.target.value)}
                    />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-gray-11 text-xs">
                    <span>Search function name</span>
                    <input
                        type="text"
                        placeholder="func_..."
                        className="w-full rounded border border-[var(--g400)] bg-[var(--g200)] px-[10px] py-2 text-[0.8rem] text-[var(--g1600)]"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </label>
            </div>

            {url ? (
                <GroupList url={url} />
            ) : (
                <p className="py-4 text-gray-11 text-sm">
                    {presets
                        ? "No presets available for this platform."
                        : "Loading presets…"}
                </p>
            )}
        </section>
    );
}
