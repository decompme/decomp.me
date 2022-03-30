import * as api from "../../lib/api"
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

export default function PresetSelect({ className, platform, presetName, setPreset, serverPresets }: {
    className?: string
    platform: string
    presetName: string // "" for custom
    setPreset: (preset: api.CompilerPreset) => void
    serverPresets?: api.CompilerPreset[]
}) {
    if (!serverPresets)
        serverPresets = api.usePlatforms()[platform].presets

    const selectedPreset = serverPresets.find(p => p.name === presetName)

    if (!selectedPreset && presetName !== "")
        console.warn(`Scratch.preset == '${presetName}' but no preset with that name was found.`)

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
