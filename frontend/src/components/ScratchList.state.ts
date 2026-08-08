export interface ScratchFilterState {
    platform?: string;
    preset?: number;
}

export function selectScratchPlatform(
    platform: string | undefined,
): ScratchFilterState {
    return platform ? { platform } : {};
}

export function selectScratchPreset(
    filters: ScratchFilterState,
    preset: number | undefined,
): ScratchFilterState {
    return { ...filters, preset };
}

export function buildScratchListUrl(
    baseUrl: string,
    ordering: string,
    filters: ScratchFilterState,
): string {
    const queryIndex = baseUrl.indexOf("?");
    const path = queryIndex === -1 ? baseUrl : baseUrl.slice(0, queryIndex);
    const query = queryIndex === -1 ? "" : baseUrl.slice(queryIndex + 1);
    const params = new URLSearchParams(query);

    params.set("ordering", ordering);
    if (filters.platform) {
        params.set("platform", filters.platform);
    }
    if (filters.preset !== undefined) {
        params.set("preset", filters.preset.toString());
    }

    return `${path}?${params.toString()}`;
}
