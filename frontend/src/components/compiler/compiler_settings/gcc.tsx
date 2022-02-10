import { Checkbox, FlagSet, FlagOption } from "../CompilerOpts"

export function CommonGccFlags() {
    return <>
        <FlagSet name="Optimization level">
            <FlagOption flag="-O0" description="No optimization" />
            <FlagOption flag="-O1" description="Some optimization" />
            <FlagOption flag="-O2" description="Standard optimization" />
        </FlagSet>

        <FlagSet name="char type">
            <FlagOption flag="-fsigned-char" description="char will be used as signed char" />
            <FlagOption flag="-funsigned-char" description="char will be used as usigned char" />
        </FlagSet>

        <Checkbox flag="-fforce-addr" description="Load pointers into registers before use" />

        <Checkbox flag="-Wall" description="Enable all warning types" />
    </>
}
