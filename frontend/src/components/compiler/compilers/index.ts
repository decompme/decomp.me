import { FunctionComponent } from "react"

import * as api from "../../../lib/api"

import * as EeGcc296 from "./ee-gcc2.96"
import * as Gcc281 from "./gcc2.8.1"
import * as Ido53 from "./ido5.3"
import * as Ido71 from "./ido7.1"
import * as Mwcc233b144 from "./mwcc_233_144"
import * as Mwcc247b108 from "./mwcc_247_108"
import * as Mwcc247b92 from "./mwcc_247_92"
import * as Psyq41 from "./psyq4.1"
import * as Psyq43 from "./psyq4.3"
import * as Psyq46 from "./psyq4.6"

const COMPILERS: CompilerModule[] = [
    Gcc281,
    Ido53,
    Ido71,
    EeGcc296,
    Mwcc233b144,
    Mwcc247b108,
    Mwcc247b92,
    Psyq41,
    Psyq43,
    Psyq46,
]

export type CompilerModule = { id: string, name: string, Flags: FunctionComponent }

export default COMPILERS

export function useCompilersForPlatform(platform?: string, serverCompilers?: Record<string, { platform: string | null }>) {
    if (!serverCompilers)
        serverCompilers = api.useCompilers()

    if (platform)
        return COMPILERS.filter(compiler => serverCompilers[compiler.id]?.platform === platform) // compiler supports this platform
    else
        return COMPILERS.filter(compiler => serverCompilers[compiler.id] !== undefined) // server supports this compiler
}
