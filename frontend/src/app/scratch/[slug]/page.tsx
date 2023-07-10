import { Metadata, ResolvingMetadata } from "next"

import { getScoreText } from "@/components/ScoreBadge"

import getScratchDetails from "./getScratchDetails"
import ScratchEditor from "./ScratchEditor"

export async function generateMetadata({ params }: { params: { slug: string }}, parent: ResolvingMetadata):Promise<Metadata> {
    const { scratch, parentScratch, compilation } = await getScratchDetails(params.slug)
    const parentData = await parent

    let description = `Score: ${getScoreText(compilation?.diff_output?.current_score ?? -1, compilation?.diff_output?.max_score ?? -1, scratch.match_override)}`
    if (scratch.owner)
        description += `\nOwner: ${scratch.owner.username}`
    if (parentScratch)
        description += `\nForked from: @${parentScratch.owner?.username ?? "?"}/${parentScratch.name}`
    if (scratch.description)
        description += `\n\n${scratch.description}`

    return {
        title: scratch.name,
        description: description,
        openGraph: {
            ...parentData.openGraph,
            title: scratch.name,
            description: description,
        },
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
