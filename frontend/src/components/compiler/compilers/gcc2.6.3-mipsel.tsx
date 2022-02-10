import { CommonGccFlags } from "../compiler_settings/gcc"
import { FlagOption, FlagSet } from "../CompilerOpts"

export const name = "GCC 2.6.3 (mipsel)"
export const id = "gcc2.6.3-mipsel"

export function Flags() {
    return <>
        { CommonGccFlags() }

        <FlagSet name="Small data limit">
            <FlagOption flag="-G0" description="0 bytes" />
            <FlagOption flag="-G4" description="4 bytes" />
            <FlagOption flag="-G8" description="8 bytes" />
        </FlagSet>
    </>
}
