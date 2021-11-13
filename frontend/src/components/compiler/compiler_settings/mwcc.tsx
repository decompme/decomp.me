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

        <FlagSet name="Floating point">
            <FlagOption flag="-fp soft" description="Software emulation; default" />
            <FlagOption flag="-fp off" description="No floating point" />
            <FlagOption flag="-fp hard" description="Hardware" />
            <FlagOption flag="-fp fmadd" description="Hardware + -fp_contract" />
        </FlagSet>

        <FlagSet name="Inline options">
            <FlagOption flag="-inline on" description="Turn on inlining for 'inline' functions; default" />
            <FlagOption flag="-inline off" description="Turn off inlining" />
            <FlagOption flag="-inline auto" description="Auto-inline small functions" />
            <FlagOption flag="-inline noauto" description="Do not auto-inline; default" />
            <FlagOption flag="-inline all" description="Turn on aggressive inlining: same as '-inline on, auto'" />
            <FlagOption flag="-inline deferred" description="Defer inlining until end of compilation unit" />
            <FlagOption flag="-inline level=n" description="Cased; inline functions up to 'n' levels (0-8)" />
        </FlagSet>

        <FlagSet name="String constant options">
            <FlagOption flag="-str reuse" description="Equivalent strings are the same object; default" />
            <FlagOption flag="-str pool" description="Pool strings into a single data object" />
            <FlagOption flag="-str readonly" description="make all string constants read-only" />
            <FlagOption flag="-str reuse,pool,readonly" description="Reuse + pool + readonly" />
        </FlagSet>

        <Checkbox flag="-g" description="Enable debug info" />

        <Checkbox flag="-lang=c++" description="Enable C++ language extensions" />
        <Checkbox flag="-align powerpc" description="PowerPC alignment; default" />
        <Checkbox flag="-char unsigned" description="Chars are unsigned" />
        <Checkbox flag="-Cpp_exceptions off" description="Disable C++ exceptions" />
        <Checkbox flag="-enc SJIS" description="Specifies SJIS source encoding" />
        <Checkbox flag="-enum int" description="Use int-sized enums" />
        <Checkbox flag="-fp_contract on" description="Generate fused multiply-add instructions" />
        <Checkbox flag="-lang=c99" description="Specify source language as c99" />
        <Checkbox flag="-maxerrors 1" description="Maximum number of errors to print (1)" />
        <Checkbox flag="-msgstyle gcc" description="gcc error/warning message style" />
        <Checkbox flag="-nodefaults" description="Equivalent to '-nostdinc'" />
        <Checkbox flag="-rostr" description="Make string constants read-only" />
        <Checkbox flag="-RTTI off" description="Disable run-time typing information (for C++)" />
        <Checkbox flag="-use_lmw_stmw on" description="Use multiple-word load/store instructions for structure copies; default" />
    </>
}
