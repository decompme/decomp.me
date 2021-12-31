import { Checkbox, FlagSet, FlagOption } from "../CompilerOpts"

export function CommonMWCCArmFlags() {
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

        <FlagSet name="Inline options">
            <FlagOption flag="-inline on" description="Turn on inlining for 'inline' functions; default" />
            <FlagOption flag="-inline off" description="Turn off inlining" />
            <FlagOption flag="-inline auto" description="Auto-inline small functions" />
            <FlagOption flag="-inline noauto" description="Do not auto-inline; default" />
            <FlagOption flag="-inline all" description="Turn on aggressive inlining: same as '-inline on, auto'" />
            <FlagOption flag="-inline deferred" description="Defer inlining until end of compilation unit" />
            <FlagOption flag="-inline level=n" description="Cased; inline functions up to 'n' levels (0-8)" />
        </FlagSet>

        <FlagSet name="Source language">
            <FlagOption flag="-lang=c" description="C" />
            <FlagOption flag="-lang=c++" description="C++" />
            <FlagOption flag="-lang=c99" description="C99" />
            <FlagOption flag="-lang=ec++" description="Embedded C++" />
            <FlagOption flag="-lang=objc" description="Allow Objective C extensions" />
        </FlagSet>

        <Checkbox flag="-g" description="Enable debug info" />

        <Checkbox flag="-char signed" description="Chars are signed" />
        <Checkbox flag="-Cpp_exceptions off" description="Disable C++ exceptions" />
        <Checkbox flag="-enum int" description="Use int-sized enums" />
        <Checkbox flag="-rostr" description="Make string constants read-only" />
        <Checkbox flag="-RTTI off" description="Disable run-time typing information (for C++)" />
    </>
}
