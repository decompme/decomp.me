import type { Preset } from "@/lib/api/types";

import Select from "../Select2";

function presetsToOptions(presets: Preset[]) {
    const options: Record<string, string> = {};

    options.Custom = "Custom";

    for (const preset of presets) {
        options[preset.name] = preset.name;
    }

    return options;
}

export default function PresetSelect({
    availablePresets,
    className,
    presetId,
    setPreset,
}: {
    availablePresets: Preset[];
    className?: string;
    presetId?: number;
    setPreset: (preset: Preset) => void;
}) {
    if (typeof availablePresets === "undefined") {
        return (
            <Select
                className={className}
                options={{ Loading: "Loading..." }}
                value={"Loading"}
                onChange={null}
            />
        );
    }

    const selectedPreset = availablePresets.find(
        (p: Preset) => p.id === presetId,
    );

    if (
        availablePresets.length > 0 &&
        typeof presetId === "number" &&
        !selectedPreset
    )
        console.warn(
            `Scratch.preset == '${presetId}' but no preset with that id was found.`,
        );

    return (
        <Select
            className={className}
            options={presetsToOptions(availablePresets)}
            value={selectedPreset?.name || "Custom"}
            onChange={(name) => {
                setPreset(
                    name === "Custom"
                        ? null
                        : availablePresets.find((p: Preset) => p.name === name),
                );
            }}
        />
    );
}
