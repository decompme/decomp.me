import { Checkbox, FlagSet, FlagOption } from "../CompilerOpts"

export const name = "2.3.3 build 144 (GC MW 1.0)"
export const id = "mwcc_233_144"

export function Flags() {
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

        <Checkbox flag="-g" description="Enable debug info" />

        <Checkbox flag="-Cpp_exceptions off" description="-Cpp_exceptions off" />
        <Checkbox flag="-fp_contract on" description="-fp_contract on" />
        <Checkbox flag="-msgstyle gcc " description="-msgstyle gcc " />
        <Checkbox flag="-maxerrors 1" description="-maxerrors 1" />
        <Checkbox flag="-RTTI off" description="-RTTI off" />
        <Checkbox flag="-str reuse,pool,readonly" description="-str reuse,pool,readonly" />
        <Checkbox flag="-char unsigned" description="-char unsigned" />
        <Checkbox flag="-enum int" description="-enum int" />
        <Checkbox flag="-use_lmw_stmw on" description="-use_lmw_stmw on" />
        <Checkbox flag="-inline off" description="-inline off" />

    </>
}
