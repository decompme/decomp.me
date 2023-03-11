import * as api from "@/lib/api"

export function useCompilersForPlatform(platform?: string, compilers?: Record<string, api.Compiler>): Record<string, api.Compiler> {
    if (!compilers)
        compilers = api.useCompilers()

    if (platform) {
        const c = {}

        for (const [k, v] of Object.entries(compilers)) {
            if (v.platform == platform)
                c[k] = v
        }

        return c
    } else {
        return compilers
    }
}
