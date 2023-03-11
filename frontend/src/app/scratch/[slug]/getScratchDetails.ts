import { get, bubbleNotFound, ResponseError } from "@/lib/api/request"
import { Scratch, Compilation } from "@/lib/api/types"

export default async function getScratchDetails(slug: string) {
    const scratch: Scratch = await get(`/scratch/${slug}`).catch(bubbleNotFound)

    let compilation: Compilation | null = null
    try {
        compilation = await get(`${scratch.url}/compile`)
    } catch (error) {
        if (error instanceof ResponseError && error.status !== 400) {
            compilation = null
        } else {
            throw error
        }
    }

    const parentScratch: Scratch | null = scratch.parent ? await get(scratch.parent) : null

    return {
        scratch,
        parentScratch,
        compilation,
    }
}
