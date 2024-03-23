import * as api from "@/lib/api"

import Select from "../Select2"

function presetsToOptions(presets: api.Preset[]) {
    const options: Record<string, string> = {}

    options["Custom"] = "Custom"

    for (const preset of presets) {
        options[preset.name] = preset.name
    }

    return options
}

export default function PresetSelect({ className, platform, presetId, setPreset, serverPresets }: {
    className?: string
    platform: string
    presetId?: number
    setPreset: (preset: api.Preset) => void
    serverPresets?: api.Preset[]
}) {
    if (typeof serverPresets === "undefined")
        serverPresets = api.usePresets(platform)

    const sortedPresets = typeof serverPresets === "undefined" ? null : serverPresets.toSorted((a, b) => a.name[0].localeCompare(b.name[0]))

    if (sortedPresets === null) {
        return <Select
            className={className}
            options={{ "Loading": "Loading..." }}
            value={"Loading"}
            onChange={null}
        />
    }

    const selectedPreset = sortedPresets.find((p: api.Preset) => p.id === presetId)

    if (sortedPresets.length > 0 && typeof presetId === "number" && !selectedPreset)
        console.warn(`Scratch.preset == '${presetId}' but no preset with that id was found.`)

    return <Select
        className={className}
        options={presetsToOptions(sortedPresets)}
        value={selectedPreset?.name || "Custom"}
        onChange={name => {
            setPreset(name === "Custom" ? null : sortedPresets.find((p: api.Preset) => p.name === name))
        }}
    />
}
