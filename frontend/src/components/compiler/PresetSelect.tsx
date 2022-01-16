
import Select from "../Select"

import { CompilerPreset } from "./CompilerOpts"
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
        name: "Diddy Kong Racing",
        compiler: "ido5.3",
        opts: "-mips1 -O2",
    },
    {
        name: "Mario Party 3",
        compiler: "gcc2.7kmc",
        opts: "-O1 -mips2",
    },
    {
        name: "Dinosaur Planet",
        compiler: "ido5.3",
        opts: "-O2 -g3 -mips2",
    },
    {
        name: "Evo's Space Adventures",
        compiler: "psyq4.6",
        opts: "-O2",
    },
    {
        name: "The Thousand-Year Door",
        compiler: "mwcc_247_108",
        opts: "-fp hard -fp_contract on -enum int -O4,p -sdata 48 -sdata2 6 -rostr -multibyte -use_lmw_stmw on -inline deferred -Cpp_exceptions off",
    },
    {
        name: "Pikmin",
        compiler: "mwcc_233_163e",
        opts: "-lang=c++ -nodefaults -Cpp_exceptions off -RTTI on -fp hard -O4,p",
    },
    {
        name: "Pikmin 2",
        compiler: "mwcc_247_107",
        opts: "-lang=c++ -nodefaults -Cpp_exceptions off -RTTI off -fp hard -fp_contract on -rostr -O4,p -use_lmw_stmw on -enum int -inline auto -sdata 8 -sdata2 8",
    },
    {
        name: "Battle for Bikini Bottom",
        compiler: "mwcc_247_92",
        opts: "-lang=c++ -g -Cpp_exceptions off -RTTI off -fp hard -fp_contract on -O4,p -maxerrors 1 -str reuse,pool,readonly -char unsigned -enum int -use_lmw_stmw on -inline off",
    },
    {
        name: "Super Monkey Ball",
        compiler: "mwcc_233_159",
        opts: "-O4,p -nodefaults -fp hard -Cpp_exceptions off -enum int -inline auto",
    },
    {
        name: "Twilight Princess",
        compiler: "mwcc_247_108_tp",
        opts: "-lang=c++ -Cpp_exceptions off -nodefaults -O3 -fp hard -msgstyle gcc -str pool,readonly,reuse -RTTI off -maxerrors 1 -enum int",
    },
    {
        name: "Wii Sports",
        compiler: "mwcc_41_60831",
        opts: "-lang=c++ -enum int -inline auto -Cpp_exceptions off -RTTI off -fp hard -O4,p -nodefaults",
    },
    {
        name: "Super Smash Bros. Melee",
        compiler: "mwcc_233_163e",
        opts: "-O4,p -nodefaults -fp hard -Cpp_exceptions off -enum int -fp_contract on -inline auto",
    },
    {
        name: "Super Paper Mario (DOL)",
        compiler: "mwcc_41_60831",
        opts: "-lang=c99 -enc SJIS -fp hard -O4 -use_lmw_stmw on -str pool -rostr -inline all -sdata 4 -sdata2 4",
    },
    {
        name: "Super Paper Mario (REL)",
        compiler: "mwcc_41_60831",
        opts: "-lang=c99 -enc SJIS -fp hard -O4 -use_lmw_stmw on -str pool -rostr -ipa file -sdata 0 -sdata2 0 -pool off -ordered-fp-compares",
    },
    {
        name: "Super Mario Galaxy",
        compiler: "mwcc_41_60126",
        opts: "-Cpp_exceptions off -stdinc -nodefaults -fp hard -lang=c++ -inline auto,level=2 -ipa file -O4,s -rtti off -sdata 4 -sdata2 4 -align powerpc -enum int",
    },
    {
        name: "Super Mario Sunshine",
        compiler: "mwcc_233_163",
        opts: "-lang=c++ -Cpp_exceptions off -fp hard -O4 -nodefaults -enum int -rostr",
    },
    {
        name: "The Minish Cap",
        compiler: "agbcc",
        opts: "-O2 -Wimplicit -Wparentheses -Werror -Wno-multichar -g3",
    },
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
