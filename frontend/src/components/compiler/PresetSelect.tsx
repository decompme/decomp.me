import * as api from "@/lib/api"

import Select from "../Select2"

function presetsToOptions(presets: api.Preset[]): { [key: string]: string } {
    const options = {}

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
    if (!serverPresets)
        serverPresets = api.usePlatforms()[platform].presets

    const selectedPreset = serverPresets.find(p => p.id === presetId)

    if (!selectedPreset && presetId !== undefined && presetId !== null)
        console.warn(`Scratch.preset == '${presetId}' but no preset with that id was found.`)

    return <Select
        className={className}
        options={presetsToOptions(serverPresets)}
        value={selectedPreset?.name || "Custom"}
        onChange={name => {
            setPreset(serverPresets.find(p => p.name === name))
        }}
    />
}
