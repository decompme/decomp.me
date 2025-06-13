export const runtime = "edge";

import type { Metadata, ResolvingMetadata } from "next";

import getScratchDetails from "./getScratchDetails";
import ScratchEditor from "./ScratchEditor";

export async function generateMetadata(
    props: { params: Promise<{ slug: string }> },
    parent: ResolvingMetadata,
): Promise<Metadata> {
    const params = await props.params;
    const { scratch } = await getScratchDetails(params.slug);
    const parentData = await parent;

    return {
        title: scratch.name,
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
    };
}

export default async function Page(props: {
    params: Promise<{ slug: string }>;
}) {
    const params = await props.params;
    const { scratch, parentScratch, compilation } = await getScratchDetails(
        params.slug,
    );

    return (
        <ScratchEditor
            initialScratch={scratch}
            parentScratch={parentScratch}
            initialCompilation={compilation}
        />
    );
}
