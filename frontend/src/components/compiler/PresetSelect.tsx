
import * as api from "../../lib/api"
import Select from "../Select"

import { useCompilersForPlatform } from "./compilers"

export default function PresetSelect({ className, platform, flags, setPreset, serverCompilers }: {
    className?: string
    platform: string
    flags: string
    setPreset: (preset: api.CompilerPreset) => void
    serverCompilers?: Record<string, api.Compiler>
}) {
    const compilers = useCompilersForPlatform(platform, serverCompilers)

    const presets = Object.values(compilers).map(c => c.presets).flat()

    const selectedPreset = presets.find(p => p.flags === flags)

    return <Select className={className} onChange={e => {
        if ((e.target as HTMLSelectElement).value === "custom") {
            return
        }

        const preset = presets.find(p => p.name === (e.target as HTMLSelectElement).value)

        setPreset(preset)
    }}>
        {!selectedPreset && <option value="custom" selected>Custom</option>}
        {presets.map(preset =>
            <option key={preset.name} value={preset.name} selected={preset === selectedPreset}>
                {preset.name}
            </option>
        )}
    </Select>
}
