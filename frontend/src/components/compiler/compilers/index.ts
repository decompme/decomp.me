import { FunctionComponent } from "react"

import * as api from "../../../lib/api"

import * as EeGcc296 from "./ee-gcc2.96"
import * as Gcc27kmc from "./gcc2.7kmc"
import * as Gcc281 from "./gcc2.8.1"
import * as Ido53 from "./ido5.3"
import * as Ido71 from "./ido7.1"
import * as Mwcc233b144 from "./mwcc_233_144"
import * as Mwcc233b159 from "./mwcc_233_159"
import * as Mwcc233b163 from "./mwcc_233_163"
import * as Mwcc242b81 from "./mwcc_242_81"
import * as Mwcc247b105 from "./mwcc_247_105"
import * as Mwcc247b107 from "./mwcc_247_107"
import * as Mwcc247b108 from "./mwcc_247_108"
import * as Mwcc247b108Pikmin2 from "./mwcc_247_108_pikmin2"
import * as Mwcc247b108Tp from "./mwcc_247_108_tp"
import * as Mwcc247b92 from "./mwcc_247_92"
import * as Mwcc41b60126 from "./mwcc_41_60126"
import * as Mwcc41b60831 from "./mwcc_41_60831"
import * as Mwcc42b142 from "./mwcc_42_142"
import * as Mwcc43b151 from "./mwcc_43_151"
import * as Mwcc43b172 from "./mwcc_43_172"
import * as Mwcc43b213 from "./mwcc_43_213"
import * as Psyq41 from "./psyq4.1"
import * as Psyq43 from "./psyq4.3"
import * as Psyq46 from "./psyq4.6"

const COMPILERS: CompilerModule[] = [
    Gcc281,
    Ido53,
    Ido71,
    Gcc27kmc,
    EeGcc296,
    Mwcc233b144,
    Mwcc233b159,
    Mwcc233b163,
    Mwcc242b81,
    Mwcc247b105,
    Mwcc247b107,
    Mwcc247b108,
    Mwcc247b108Pikmin2,
    Mwcc247b108Tp,
    Mwcc247b92,
    Mwcc41b60831,
    Mwcc41b60126,
    Mwcc42b142,
    Mwcc43b151,
    Mwcc43b172,
    Mwcc43b213,
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
