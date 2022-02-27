import { FunctionComponent } from "react"

import * as api from "../../../lib/api"

import * as Agbcc from "./agbcc"
import * as Agbccpp from "./agbccpp"
import * as Clang391 from "./clang-3.9.1"
import * as Clang401 from "./clang-4.0.1"
import * as Dummy from "./dummy"
import * as EeGcc296 from "./ee-gcc2.96"
import * as Gcc263mipsel from "./gcc2.6.3-mipsel"
import * as Gcc272psyq from "./gcc2.7.2-psyq"
import * as Gcc272kmc from "./gcc2.7.2kmc"
import * as Gcc281 from "./gcc2.8.1"
import * as Gcc281psyq from "./gcc2.8.1-psyq"
import * as Gcc2952psyq from "./gcc2.95.2-psyq"
import * as Ido53 from "./ido5.3"
import * as Ido71 from "./ido7.1"
import * as Mwcc20b72 from "./mwcc_20_72"
import * as Mwcc20b79 from "./mwcc_20_79"
import * as Mwcc20b82 from "./mwcc_20_82"
import * as Mwcc20b84 from "./mwcc_20_84"
import * as Mwcc20b87 from "./mwcc_20_87"
import * as Mwcc233b144 from "./mwcc_233_144"
import * as Mwcc233b159 from "./mwcc_233_159"
import * as Mwcc233b163 from "./mwcc_233_163"
import * as Mwcc233b163e from "./mwcc_233_163e"
import * as Mwcc242b81 from "./mwcc_242_81"
import * as Mwcc247b105 from "./mwcc_247_105"
import * as Mwcc247b107 from "./mwcc_247_107"
import * as Mwcc247b108 from "./mwcc_247_108"
import * as Mwcc247b108Tp from "./mwcc_247_108_tp"
import * as Mwcc247b92 from "./mwcc_247_92"
import * as Mwcc30b114 from "./mwcc_30_114"
import * as Mwcc30b123 from "./mwcc_30_123"
import * as Mwcc30b126 from "./mwcc_30_126"
import * as Mwcc30b131 from "./mwcc_30_131"
import * as Mwcc30b133 from "./mwcc_30_133"
import * as Mwcc30b134 from "./mwcc_30_134"
import * as Mwcc30b136 from "./mwcc_30_136"
import * as Mwcc30b137 from "./mwcc_30_137"
import * as Mwcc30b138 from "./mwcc_30_138"
import * as Mwcc30b139 from "./mwcc_30_139"
import * as Mwcc40b1018 from "./mwcc_40_1018"
import * as Mwcc40b1024 from "./mwcc_40_1024"
import * as Mwcc40b1026 from "./mwcc_40_1026"
import * as Mwcc40b1027 from "./mwcc_40_1027"
import * as Mwcc40b1028 from "./mwcc_40_1028"
import * as Mwcc40b1034 from "./mwcc_40_1034"
import * as Mwcc40b1036 from "./mwcc_40_1036"
import * as Mwcc40b1051 from "./mwcc_40_1051"
import * as Mwcc41b60126 from "./mwcc_41_60126"
import * as Mwcc41b60831 from "./mwcc_41_60831"
import * as Mwcc42b142 from "./mwcc_42_142"
import * as Mwcc43b151 from "./mwcc_43_151"
import * as Mwcc43b172 from "./mwcc_43_172"
import * as Mwcc43b213 from "./mwcc_43_213"
import * as OldAgbcc from "./old_agbcc"
import * as Psyq40 from "./psyq4.0"
import * as Psyq41 from "./psyq4.1"
import * as Psyq43 from "./psyq4.3"
import * as Psyq46 from "./psyq4.6"

const COMPILERS: CompilerModule[] = [
    Gcc281,
    Ido53,
    Ido71,
    Gcc272kmc,
    Gcc263mipsel,
    Gcc272psyq,
    Gcc281psyq,
    Gcc2952psyq,
    EeGcc296,
    Mwcc20b72,
    Mwcc20b79,
    Mwcc20b82,
    Mwcc20b84,
    Mwcc20b87,
    Mwcc233b144,
    Mwcc233b159,
    Mwcc233b163,
    Mwcc233b163e,
    Mwcc242b81,
    Mwcc247b105,
    Mwcc247b107,
    Mwcc247b108,
    Mwcc247b108Tp,
    Mwcc247b92,
    Mwcc30b114,
    Mwcc30b123,
    Mwcc30b126,
    Mwcc30b131,
    Mwcc30b133,
    Mwcc30b134,
    Mwcc30b136,
    Mwcc30b137,
    Mwcc30b138,
    Mwcc30b139,
    Mwcc40b1018,
    Mwcc40b1024,
    Mwcc40b1026,
    Mwcc40b1027,
    Mwcc40b1028,
    Mwcc40b1034,
    Mwcc40b1036,
    Mwcc40b1051,
    Mwcc41b60831,
    Mwcc41b60126,
    Mwcc42b142,
    Mwcc43b151,
    Mwcc43b172,
    Mwcc43b213,
    Psyq40,
    Psyq41,
    Psyq43,
    Psyq46,
    Agbcc,
    OldAgbcc,
    Agbccpp,
    Dummy,
    Clang391,
    Clang401,
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
