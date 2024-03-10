import { Metadata, ResolvingMetadata } from "next"

import getScratchDetails from "./getScratchDetails"
import ScratchEditor from "./ScratchEditor"

export async function generateMetadata({ params }: { params: { slug: string }}, parent: ResolvingMetadata):Promise<Metadata> {
    const { scratch } = await getScratchDetails(params.slug)
    const parentData = await parent

    return {
        title: scratch.name,
        metadataBase: new URL(process.env.FRONTEND_BASE),
        openGraph: {
            ...parentData.openGraph,
            title: scratch.name,
            images: [
                {
                    url: `scratch/${scratch.slug}/opengraph-image`,
                    width: 1200,
                    height: 400,
                },
            ],

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
