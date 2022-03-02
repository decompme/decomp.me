
import Select from "../Select"

import { CompilerPreset } from "./CompilerOpts"
import { useCompilersForPlatform } from "./compilers"

export const PRESETS = [
    // TODO load from compilers endpoint
]

export default function PresetSelect({ className, platform, compiler, opts, setPreset, serverCompilers }: {
    className?: string
    platform: string
    compiler: string
    opts: string
    setPreset: (preset: CompilerPreset) => void
    serverCompilers?: Record<string, { platform: string | null }>
}) {
    const compilers = useCompilersForPlatform(platform, serverCompilers)

    const presets = PRESETS.filter(p => compilers?.find(c => c.id === p.compiler) !== undefined)
    const selectedPreset = PRESETS.find(p => p.compiler === compiler && p.opts === opts)

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
