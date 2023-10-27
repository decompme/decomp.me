import * as api from "@/lib/api"

import Select from "../Select2"

function presetsToOptions(presets: api.CompilerPreset[], addCustom: boolean): { [key: string]: string } {
    const options = {}

    if (addCustom) {
        options["Custom"] = "Custom"
    }

    for (const preset of presets) {
        options[preset.name] = preset.name
    }

    return options
}

export default function PresetSelect({ className, platform, presetId, setPreset, serverPresets }: {
    className?: string
    platform: string
    presetId?: number
    setPreset: (preset: api.CompilerPreset) => void
    serverPresets?: api.CompilerPreset[]
}) {
    if (!serverPresets)
        serverPresets = api.usePlatforms()[platform].presets

    const selectedPreset = serverPresets.find(p => p.id === presetId)

    if (!selectedPreset && presetId !== undefined)
        console.warn(`Scratch.preset == '${presetId}' but no preset with that id was found.`)

    return <Select
        className={className}
        options={presetsToOptions(serverPresets, !selectedPreset)}
        value={selectedPreset?.name || "Custom"}
        onChange={name => {
            const preset = serverPresets.find(p => p.name === name)
            if (preset)
                setPreset(preset)
        }}
    />
}
