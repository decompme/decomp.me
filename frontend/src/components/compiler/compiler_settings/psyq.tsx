import { Checkbox, FlagSet, FlagOption } from "../CompilerOpts"

export function CommonPsyqFlags() {
    return <>
        <FlagSet name="Optimization level">
            <FlagOption flag="-O0" description="No optimization" />
            <FlagOption flag="-O1" description="Some optimization" />
            <FlagOption flag="-O2" description="Standard optimization" />
            <FlagOption flag="-O3" description="Heavy optimization" />
            <FlagOption flag="-Os" description="Size optimization" />
        </FlagSet>

        <FlagSet name="Debug information">
            <FlagOption flag="-g0" description="No debug info" />
            <FlagOption flag="-g1" description="Minimal trace info" />
            <FlagOption flag="-g2" description="Local variable tracking" />
            <FlagOption flag="-g3" description="Macro expansions" />
        </FlagSet>

        <FlagSet name="Small data limit">
            <FlagOption flag="-G0" description="0 bytes" />
            <FlagOption flag="-G8" description="8 bytes" />
        </FlagSet>

        <Checkbox flag="-Wall" description="Enable all warning types" />
    </>
}
