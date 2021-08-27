import { h } from "preact"

import Select from "../Select"

export const presets = [
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
]

export default function PresetSelect({ compiler, opts, setCompiler, setOpts }) {
    const selectedPreset = presets.find(p => p.compiler === compiler && p.opts === opts)

    return <Select onChange={e => {
        if (e.target.value === "custom") {
            return
        }

        const preset = presets[parseInt(e.target.value, 10)]

        setOpts(preset.opts)
        setCompiler(preset.compiler)
    }}>
        {!selectedPreset && <option value="custom" selected>Custom</option>}
        {presets.map((preset, idx) =>
            <option key={idx} value={idx} selected={preset === selectedPreset}>
                {preset.name}
            </option>
        )}
    </Select>
}
