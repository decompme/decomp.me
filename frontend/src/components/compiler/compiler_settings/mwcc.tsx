import { Checkbox, FlagSet, FlagOption } from "../CompilerOpts"

export function CommonMWCCFlags() {
    return <>
        <FlagSet name="Optimization level">
            <FlagOption flag="-O0" description="No optimization" />
            <FlagOption flag="-O1" description="Some optimization" />
            <FlagOption flag="-O1,p" description="Some optimization + speed" />
            <FlagOption flag="-O1,s" description="Some optimization + space" />
            <FlagOption flag="-O2" description="Standard optimization" />
            <FlagOption flag="-O2,p" description="Standard optimization + speed" />
            <FlagOption flag="-O2,s" description="Standard optimization + space" />
            <FlagOption flag="-O3" description="Heavy optimization" />
            <FlagOption flag="-O3,p" description="Heavy optimization + speed" />
            <FlagOption flag="-O3,s" description="Heavy optimization + space" />
            <FlagOption flag="-O4" description="Extreme optimization" />
            <FlagOption flag="-O4,p" description="Extreme optimization + speed" />
            <FlagOption flag="-O4,s" description="Extreme optimization + space" />
        </FlagSet>

        <FlagSet name="Floating Point Codegen">
            <FlagOption flag="-fp soft" description="Software Emulation (Default)" />
            <FlagOption flag="-fp off" description="No Floating Point" />
            <FlagOption flag="-fp hard" description="Hardware" />
            <FlagOption flag="-fp fmadd" description="Hardware + -fp_contract" />
        </FlagSet>

        <Checkbox flag="-g" description="Enable debug info" />

        <Checkbox flag="-align powerpc" description="-align powerpc" />
        <Checkbox flag="-char unsigned" description="-char unsigned" />
        <Checkbox flag="-Cpp_exceptions off" description="-Cpp_exceptions off" />
        <Checkbox flag="-enc SJIS" description="-enc SJIS" />
        <Checkbox flag="-enum int" description="-enum int" />
        <Checkbox flag="-fp_contract on" description="-fp_contract on" />
        <Checkbox flag="-inline all" description="-inline all" />
        <Checkbox flag="-inline off" description="-inline off" />
        <Checkbox flag="-lang=c99" description="-lang=c99" />
        <Checkbox flag="-maxerrors 1" description="-maxerrors 1" />
        <Checkbox flag="-msgstyle gcc" description="-msgstyle gcc" />
        <Checkbox flag="-nodefaults" description="-nodefaults" />
        <Checkbox flag="-rostr" description="-rostr" />
        <Checkbox flag="-RTTI off" description="-RTTI off" />
        <Checkbox flag="-str pool" description="-str pool" />
        <Checkbox flag="-str reuse,pool,readonly" description="-str reuse,pool,readonly" />
        <Checkbox flag="-use_lmw_stmw on" description="-use_lmw_stmw on" />

    </>
}
