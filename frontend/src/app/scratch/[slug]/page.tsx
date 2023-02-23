import getScratchDetails from "./getScratchDetails"
import ScratchEditor from "./ScratchEditor"

// Always server side render, avoiding caching scratch details
export const dynamic = "force-dynamic"

export default async function Page({ params }: { params: { slug: string }}) {
    const { scratch, parentScratch, compilation } = await getScratchDetails(params.slug)

    return <ScratchEditor
        initialScratch={scratch}
        parentScratch={parentScratch}
        initialCompilation={compilation}
    />
}
