
import * as api from "../../lib/api"
import Select from "../Select"

export default function PresetSelect({ className, platform, flags, setPreset, setCompiler, serverPresets }: {
    className?: string
    platform: string
    flags: string
    setPreset: (preset: api.CompilerPreset) => void
    setCompiler: (compiler: string) => void
    serverPresets?: api.CompilerPreset[]
}) {
    if (!serverPresets)
        serverPresets = api.usePlatforms()[platform].presets

    const selectedPreset = serverPresets.find(p => p.flags === flags)

    return <Select className={className} onChange={e => {
        if ((e.target as HTMLSelectElement).value === "custom") {
            return
        }

        const preset = serverPresets.find(p => p.name === (e.target as HTMLSelectElement).value)

        setPreset(preset)
        setCompiler(preset.compiler)
    }}>
        {!selectedPreset && <option value="custom" selected>Custom</option>}
        {serverPresets.map(preset =>
            <option key={preset.name} value={preset.name} selected={preset === selectedPreset}>
                {preset.name}
            </option>
        )}
    </Select>
}
