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

export default function PresetSelect({ className, platform, preset, flags, setPreset, serverPresets }: {
    className?: string
    platform: string
    preset: api.CompilerPreset
    flags: string
    setPreset: (preset: api.CompilerPreset) => void
    serverPresets?: api.CompilerPreset[]
}) {
    if (!serverPresets)
        serverPresets = api.usePlatforms()[platform].presets

    const selectedPreset = preset || serverPresets.find(p => p.flags === flags)

    return <Select options={presetsToOptions(serverPresets, !selectedPreset)} value={selectedPreset?.name} className={className} onChange={e => {
        if (e === "Custom") {
            return
        }

        const preset = serverPresets.find(p => p.name === e)

        setPreset(preset)
    }} />
}
