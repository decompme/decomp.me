
import Select from "../Select"

import { useCompilersForPlatform } from "./compilers"

export const PRESETS = [
    {
        name: "Super Mario 64",
        compiler: "ido5.3",
        opts: "-O1 -g -mips2",
    },
    {
        name: "Mario Kart 64",
        compiler: "ido5.3",
        opts: "-O2 -mips2",
    },
    {
        name: "Paper Mario",
        compiler: "gcc2.8.1",
        opts: "-O2 -fforce-addr",
    },
    {
        name: "Ocarina of Time",
        compiler: "ido7.1",
        opts: "-O2 -mips2",
    },
    {
        name: "Majora's Mask",
        compiler: "ido7.1",
        opts: "-O2 -g3 -mips2",
    },
    {
        name: "GoldenEye / Perfect Dark",
        compiler: "ido5.3",
        opts: "-Olimit 2000 -mips2 -O2",
    },
    {
        name: "Evo's Space Adventures",
        compiler: "psyq4.6",
        opts: "-O2",
    },
    {
        name: "SpongeBob SquarePants: BfBB",
        compiler: "mwcc2.0",
        opts: "-g",
    },
]

export default function PresetSelect({ className, platform, compiler, opts, setCompiler, setOpts, serverCompilers }: {
    className?: string
    platform: string
    compiler: string
    opts: string
    setCompiler: (compiler: string) => void
    setOpts: (opts: string) => void
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

        setOpts(preset.opts)
        setCompiler(preset.compiler)
    }}>
        {!selectedPreset && <option value="custom" selected>Custom</option>}
        {presets.map(preset =>
            <option key={preset.name} value={preset.name} selected={preset === selectedPreset}>
                {preset.name}
            </option>
        )}
    </Select>
}
