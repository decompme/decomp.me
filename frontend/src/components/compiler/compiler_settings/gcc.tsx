import { Checkbox, FlagSet, FlagOption } from "../CompilerOpts"

export function CommonGccFlags() {
    return <>
        <FlagSet name="Optimization level">
            <FlagOption flag="-O0" description="No optimization" />
            <FlagOption flag="-O1" description="Some optimization" />
            <FlagOption flag="-O2" description="Standard optimization" />
        </FlagSet>

        <Checkbox flag="-fforce-addr" description="Load pointers into registers before use" />

        <Checkbox flag="-Wall" description="Enable all warning types" />
    </>
}
