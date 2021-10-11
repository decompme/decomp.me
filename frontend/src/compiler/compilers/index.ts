import { FunctionComponent } from "preact"

import * as api from "../../api"

import * as Gcc281 from "./gcc2.8.1"
import * as Ido53 from "./ido5.3"
import * as Ido71 from "./ido7.1"
import * as EeGcc296 from "./ee-gcc2.96"

export type CompilerModule = { id: string, name: string, Flags: FunctionComponent }

const COMPILERS: CompilerModule[] = [
    Gcc281,
    Ido53,
    Ido71,
    EeGcc296,
]

export default COMPILERS

export function useCompilersForArch(arch?: string) {
    const serverCompilers = api.useCompilers()

    if (!serverCompilers)
        return null

    if (arch)
        return COMPILERS.filter(compiler => serverCompilers[compiler.id]?.arch === arch) // compiler supports this arch
    else
        return COMPILERS.filter(compiler => serverCompilers[compiler.id] !== undefined) // server supports this compiler
}
