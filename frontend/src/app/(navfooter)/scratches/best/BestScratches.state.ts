import type { Preset, PlatformBase } from "@/lib/api/types";

export const DEPTH_OPTIONS: Record<string, string> = {
    "1": "Top 1",
    "3": "Top 3",
    "5": "Top 5",
    "10": "Top 10",
};
export const DEFAULT_DEPTH = "1";

export const ORDERING_OPTIONS: Record<string, string> = {
    best_match: "Best match",
    name: "Function name",
    latest: "Recently active",
    oldest: "Oldest activity",
};
export const DEFAULT_ORDERING = "best_match";

export function parsePlatformParam(
    availablePlatforms: Record<string, PlatformBase>,
    platformParam: string | undefined,
): string | undefined {
    if (platformParam && platformParam in availablePlatforms) {
        return platformParam;
    }
    return undefined;
}

export function parsePresetParam(
    presetParam: string | undefined,
): number | undefined {
    if (!presetParam) {
        return undefined;
    }
    const parsed = Number(presetParam);
    if (Number.isInteger(parsed) && parsed > 0) {
        return parsed;
    }
    return undefined;
}

export function parseDepthParam(depthParam: string | undefined): string {
    if (depthParam && depthParam in DEPTH_OPTIONS) {
        return depthParam;
    }
    return DEFAULT_DEPTH;
}

export function parseOrderingParam(orderingParam: string | undefined): string {
    if (orderingParam && orderingParam in ORDERING_OPTIONS) {
        return orderingParam;
    }
    return DEFAULT_ORDERING;
}

export function parseSearchParam(searchParam: string | undefined): string {
    return searchParam?.trim() ?? "";
}

export function resolveDefaultPlatform(
    availablePlatforms: Record<string, PlatformBase>,
    initialPlatform: string | undefined,
): string | undefined {
    if (initialPlatform && initialPlatform in availablePlatforms) {
        return initialPlatform;
    }
    if ("saturn" in availablePlatforms) {
        return "saturn";
    }
    return Object.keys(availablePlatforms)[0];
}

export function selectPresetId(
    presets: Preset[] | undefined,
    currentPresetId: number | null,
): number | null {
    if (!presets) {
        return currentPresetId;
    }
    if (presets.some((preset) => preset.id === currentPresetId)) {
        return currentPresetId;
    }
    return presets[0]?.id ?? null;
}

export function percentStringToApiFraction(
    percentStr: string,
): string | undefined {
    const trimmed = percentStr.trim();
    if (!trimmed) {
        return undefined;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
        return undefined;
    }
    const clampedPercent = Math.min(100, Math.max(0, parsed));
    return String(clampedPercent / 100);
}

export function apiFractionToPercentString(
    fractionParam: string | undefined,
): string {
    if (!fractionParam) {
        return "";
    }
    const parsed = Number(fractionParam);
    if (!Number.isFinite(parsed)) {
        return "";
    }
    const clampedFraction = Math.min(1, Math.max(0, parsed));
    return String(clampedFraction * 100);
}
