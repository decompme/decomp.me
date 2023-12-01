import { get, bubbleNotFound, ResponseError } from "@/lib/api/request"
import { Scratch, Compilation } from "@/lib/api/types"
import { scratchParentUrl, scratchUrl } from "@/lib/api/urls"

export default async function getScratchDetails(slug: string) {
    const scratch: Scratch = await get(`/scratch/${slug}`).catch(bubbleNotFound)

    let compilation: Compilation | null = null
    try {
        compilation = await get(`${scratchUrl(scratch)}/compile`)
    } catch (error) {
        if (error instanceof ResponseError && error.status !== 400) {
            compilation = null
        } else {
            throw error
        }
    }

    const parentScratch: Scratch | null = scratch.parent ? await get(scratchParentUrl(scratch)) : null

    return {
        scratch,
        parentScratch,
        compilation,
    }
}
