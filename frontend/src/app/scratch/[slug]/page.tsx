import getScratchDetails from "./getScratchDetails"
import ScratchEditor from "./ScratchEditor"

export default async function Page({ params }: { params: { slug: string }}) {
    const { scratch, parentScratch, compilation } = await getScratchDetails(params.slug)

    return <ScratchEditor
        initialScratch={scratch}
        parentScratch={parentScratch}
        initialCompilation={compilation}
    />
}
