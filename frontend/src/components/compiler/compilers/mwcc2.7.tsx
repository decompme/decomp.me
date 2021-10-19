import { Checkbox, FlagSet, FlagOption } from "../CompilerOpts"

export const name = "MWCC 2.7 (Version 2.4.7 build 108)"
export const id = "mwcc2.7"

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
    </>
}
