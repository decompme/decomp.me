import { get, bubbleNotFound, ResponseError } from "@/lib/api/request"
import { Scratch, Compilation } from "@/lib/api/types"

import ScratchEditor from "./ScratchEditor"

export async function getScratchDetails(slug: string) {
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

export default async function Page({ params }: { params: { slug: string }}) {
    const { scratch, parentScratch, compilation } = await getScratchDetails(params.slug)

    return <ScratchEditor
        initialScratch={scratch}
        parentScratch={parentScratch}
        initialCompilation={compilation}
    />
}
