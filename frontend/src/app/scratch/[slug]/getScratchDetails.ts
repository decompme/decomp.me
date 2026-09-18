import { bubbleNotFound, get, ResponseError } from "@/lib/api/request";
import { getScratch } from "@/lib/api/scratchLanguage";
import type { Compilation, Scratch } from "@/lib/api/types";
import { scratchParentUrl, scratchUrl } from "@/lib/api/urls";

export default async function getScratchDetails(slug: string) {
    const scratch: Scratch = await getScratch(`/scratch/${slug}`).catch(
        bubbleNotFound,
    );

    let compilation: Compilation | null = null;
    try {
        compilation = await get(`${scratchUrl(scratch)}/compile`);
    } catch (error) {
        if (error instanceof ResponseError && error.status !== 400) {
            compilation = null;
        } else {
            throw error;
        }
    }

    const parentScratch: Scratch | null = scratch.parent
        ? await getScratch(scratchParentUrl(scratch))
        : null;

    return {
        scratch,
        parentScratch,
        compilation,
    };
}
