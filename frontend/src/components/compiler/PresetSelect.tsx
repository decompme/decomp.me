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

    if (typeof serverPresets === "undefined") {
        return <Select
            className={className}
            options={{ "Loading": "Loading..." }}
            value={"Loading"}
            onChange={null}
        />
    }

    const selectedPreset = serverPresets.find((p: api.Preset) => p.id === presetId)

    if (serverPresets.length > 0 && typeof presetId === "number" && !selectedPreset)
        console.warn(`Scratch.preset == '${presetId}' but no preset with that id was found.`)

    return <Select
        className={className}
        options={presetsToOptions(serverPresets)}
        value={selectedPreset?.name || "Custom"}
        onChange={name => {
            setPreset(name === "Custom" ? null : serverPresets.find((p: api.Preset) => p.name === name))
        }}
    />
}
