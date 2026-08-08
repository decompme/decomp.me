import Select from "@/components/Select2";
import { usePresets } from "@/lib/api";
import type { PlatformBase } from "@/lib/api/types";

import type { ScratchFilterState } from "./ScratchList.state";

const ALL = "__all__";
const PRESET_PREFIX = "preset:";

function PresetFilter({
    platform,
    preset,
    onChange,
}: {
    platform: string;
    preset: number | undefined;
    onChange: (preset: number | undefined) => void;
}) {
    const presets = usePresets(platform) ?? [];
    const options = Object.fromEntries([
        [ALL, "All presets"],
        ...presets.map((item) => [`${PRESET_PREFIX}${item.id}`, item.name]),
    ]);

    return (
        <Select
            ariaLabel="Filter by preset"
            options={options}
            value={preset === undefined ? ALL : `${PRESET_PREFIX}${preset}`}
            onChange={(value) => {
                onChange(
                    value === ALL
                        ? undefined
                        : Number.parseInt(
                              value.slice(PRESET_PREFIX.length),
                              10,
                          ),
                );
            }}
        />
    );
}

export default function ScratchFilters({
    availablePlatforms,
    filters,
    onPlatformChange,
    onPresetChange,
}: {
    availablePlatforms?: Record<string, PlatformBase>;
    filters: ScratchFilterState;
    onPlatformChange: (platform: string | undefined) => void;
    onPresetChange: (preset: number | undefined) => void;
}) {
    const platformOptions = Object.fromEntries([
        [ALL, "All platforms"],
        ...Object.entries(availablePlatforms ?? {}).map(([id, platform]) => [
            id,
            platform.name,
        ]),
    ]);

    return (
        <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="text-gray-11 text-xs">Filter by</span>
            {availablePlatforms && (
                <Select
                    ariaLabel="Filter by platform"
                    options={platformOptions}
                    value={filters.platform ?? ALL}
                    onChange={(value) => {
                        onPlatformChange(value === ALL ? undefined : value);
                    }}
                />
            )}
            {filters.platform && (
                <PresetFilter
                    platform={filters.platform}
                    preset={filters.preset}
                    onChange={onPresetChange}
                />
            )}
        </div>
    );
}
