import PageTitle from "@/components/PageTitle"
import { getScoreText } from "@/components/ScoreBadge"

import getScratchDetails from "./getScratchDetails"

export default async function Head({ params }: { params: { slug: string }}) {
    const { scratch, parentScratch, compilation } = await getScratchDetails(params.slug)

    let description = `Score: ${getScoreText(compilation?.diff_output?.current_score ?? -1, compilation?.diff_output?.max_score ?? -1)}`
    if (scratch.owner)
        description += `\nOwner: ${scratch.owner.username}`
    if (parentScratch)
        description += `\nForked from: @${parentScratch.owner.username}/${parentScratch.name}`
    if (scratch.description)
        description += `\n\n${scratch.description}`

    return <>
        <PageTitle title={scratch.name} description={description} />
    </>
}
