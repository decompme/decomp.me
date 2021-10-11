
import Select from "../Select"

import { useCompilersForArch } from "./compilers"

export const PRESETS = [
    {
        name: "Paper Mario",
        compiler: "gcc2.8.1",
        opts: "-O2 -fforce-addr",
    },
    {
        name: "OOT",
        compiler: "ido7.1",
        opts: "-O2 -mips2",
    },
    {
        name: "MM",
        compiler: "ido7.1",
        opts: "-O2 -g3 -mips2",
    },
    {
        name: "SM64",
        compiler: "ido5.3",
        opts: "-O1 -g -mips2",
    },
]

export default function PresetSelect({ arch, compiler, opts, setCompiler, setOpts }: {
    arch: string,
    compiler: string,
    opts: string,
    setCompiler: (compiler: string) => void,
    setOpts: (opts: string) => void,
}) {
    const compilers = useCompilersForArch(arch)

    const presets = PRESETS.filter(p => compilers?.find(c => c.id === p.compiler) !== undefined)
    const selectedPreset = PRESETS.find(p => p.compiler === compiler && p.opts === opts)

    return <Select onChange={e => {
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
