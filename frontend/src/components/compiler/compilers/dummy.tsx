import { Checkbox, FlagSet, FlagOption } from "../CompilerOpts"

export const name = "Dummy"
export const id = "dummy"

export function Flags() {
    return <>
        <FlagSet name="Optimization level">
            <FlagOption flag="-O0" description="No optimization" />
            <FlagOption flag="-O1" description="Some optimization" />
            <FlagOption flag="-O2" description="Heavy optimization" />
            <FlagOption flag="-O3" description="Aggressive optimization at the expense of code size" />
            <FlagOption flag="-Os" description="Optimize for smallest code size" />
        </FlagSet>

        <FlagSet name="Debug information">
            <FlagOption flag="-g0" description="No debug info" />
            <FlagOption flag="-g1" description="Minimal trace info" />
            <FlagOption flag="-g2" description="Local variable tracking" />
            <FlagOption flag="-g3" description="Macro expansions" />
        </FlagSet>

        <Checkbox flag="-fforce-addr" description="Load pointers into registers before use" />

        <Checkbox flag="-Wall" description="Enable all warning types" />
    </>
}
