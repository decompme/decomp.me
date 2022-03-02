import { FunctionComponent } from "react"

import * as api from "../../lib/api"

const COMPILERS: CompilerModule[] = [
    // todo load from endpoint
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
