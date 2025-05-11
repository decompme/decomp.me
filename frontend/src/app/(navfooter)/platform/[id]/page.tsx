import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { PlatformIcon } from "@/components/PlatformSelect/PlatformIcon";
import ScratchList from "@/components/ScratchList";
import { ScratchItemPlatformList } from "@/components/ScratchItem";
import { get } from "@/lib/api/request";
import type { PlatformMetadata } from "@/lib/api/types";

export async function generateMetadata(props: { params: Promise<{ id: number }> }): Promise<Metadata> {
    const params = await props.params;
    let platform: PlatformMetadata;

    try {
        platform = await get(`/platform/${params.id}`);
    } catch (error) {
        console.error(error);
    }

    if (!platform) {
        return notFound();
    }

    let description = "There ";
    description += platform.num_scratches === 1 ? "is " : "are ";
    description +=
        platform.num_scratches === 0
            ? "currently no "
            : `${platform.num_scratches.toLocaleString("en-US")} `;
    description += platform.num_scratches === 1 ? "scratch " : "scratches ";
    description += "for this platform.";

    return {
        title: platform.name,
        openGraph: {
            title: platform.name,
            description: description,
        },
    };
}

export default async function Page(props: { params: Promise<{ id: number }> }) {
    const params = await props.params;
    let platform: PlatformMetadata;
    try {
        platform = await get(`/platform/${params.id}`);
    } catch (error) {
        console.error(error);
    }

    if (!platform) {
        return notFound();
    }

    return (
        <main className="mx-auto w-full max-w-3xl p-4">
            <div className="flex items-center gap-2 font-medium text-2xl">
                <PlatformIcon platform={platform.id} size={32} />
                <h1>{platform.name}</h1>
            </div>
            <p className="py-3 text-gray-11">{platform.description}</p>

            <section>
                <ScratchList
                    url={`/scratch?platform=${platform.id}&page_size=20`}
                    item={ScratchItemPlatformList}
                    isSortable={true}
                    title={`Scratches (${platform.num_scratches.toLocaleString("en-US")})`}
                />
            </section>
        </main>
    );
}
