import { Checkbox, FlagSet, FlagOption } from "../CompilerOpts"

export function CommonClangFlags() {
    //Language standard from clang-4.x, valid for 3.9.x
    return <>
        <FlagSet name="Optimization level">
            <FlagOption flag="-O0" description="No optimization" />
            <FlagOption flag="-O1" description="Some optimization" />
            <FlagOption flag="-O2" description="Heavy optimization" />
            <FlagOption flag="-O3" description="Aggressive optimization at the expense of code size" />
            <FlagOption flag="-Ofast" description="All options from -O3 + optimizations that may violate strict compliance with language standards" />
            <FlagOption flag="-Os" description="Like -O2, but optimize for smallest code size" />
            <FlagOption flag="-Oz" description="Like -Os, but reduces code size further" />
        </FlagSet>

        <FlagSet name="Debug information">
            <FlagOption flag="-g0" description="No debug info" />
            <FlagOption flag="-g1" description="Minimal trace info" />
            <FlagOption flag="-g2" description="Local variable tracking" />
            <FlagOption flag="-g3" description="Macro expansions" />
        </FlagSet>

        <FlagSet name="Language standard">
            <FlagOption flag="-std=c++98" description="ISO C++ 1998 with amendments" />
            <FlagOption flag="-std=c++03" description="ISO C++ 1998 with amendments" />
            <FlagOption flag="-std=gnu++98" description="ISO C++ 1998 with amendments and GNU extensions" />
            <FlagOption flag="-std=c++0x" description="ISO C++ 2011 with amendments" />
            <FlagOption flag="-std=c++11" description="ISO C++ 2011 with amendments" />
            <FlagOption flag="-std=gnu++0x" description="ISO C++ 2011 with amendments and GNU extensions" />
            <FlagOption flag="-std=gnu++11" description="ISO C++ 2011 with amendments and GNU extensions" />
            <FlagOption flag="-std=c++1y" description="ISO C++ 2014 with amendments" />
            <FlagOption flag="-std=c++14" description="ISO C++ 2014 with amendments" />
            <FlagOption flag="-std=gnu++1y" description="ISO C++ 2014 with amendments and GNU extensions" />
            <FlagOption flag="-std=gnu++14" description="ISO C++ 2014 with amendments and GNU extensions" />
            <FlagOption flag="-std=c++1z" description="Working draft for ISO C++ 2017" />
            <FlagOption flag="-std=gnu++1z" description="Working draft for ISO C++ 2017 with GNU extensions" />
        </FlagSet>

        <Checkbox flag="-Wall" description="Enable all warning types" />
        <Checkbox flag="-fno-rtti" description="Generate read-write position independent code" />
        <Checkbox flag="-fno-exceptions" description="Enable support for exception handling" />
    </>
}
