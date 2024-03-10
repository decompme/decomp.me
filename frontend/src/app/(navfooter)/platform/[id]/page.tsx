import { Metadata } from "next"

import { notFound } from "next/navigation"

import { PlatformIcon } from "@/components/PlatformSelect/PlatformIcon"
import ScratchList, { ScratchItemPlatformList } from "@/components/ScratchList"
import { get } from "@/lib/api/request"
import { PlatformMetadata } from "@/lib/api/types"

export async function generateMetadata({ params }: { params: { id: number } }):Promise<Metadata> {
    let platform: PlatformMetadata

    try {
        platform = await get(`/platform/${params.id}`)
    } catch (error) {
        console.error(error)
    }

    if (!platform) {
        return notFound()
    }

    let description = "There "
    description += platform.num_scratches == 1 ? "is " : "are "
    description += platform.num_scratches == 0 ? "currently no " : `${platform.num_scratches} `
    description += platform.num_scratches == 1 ? "scratch " : "scratches "
    description += "for this platform."

    return {
        title: platform.name,
        openGraph: {
            title: platform.name,
            description: description,
        },
    }
}

export default async function Page({ params }: { params: { id: number } }) {
    let platform: PlatformMetadata
    try {
        platform = await get(`/platform/${params.id}`)
    } catch (error) {
        console.error(error)
    }

    if (!platform) {
        return notFound()
    }

    return <main className="mx-auto w-full max-w-3xl p-4">
        <div className="flex items-center gap-2 text-2xl font-medium">
            <PlatformIcon platform={platform.id} size={32} />
            <h1>
                {platform.name}
            </h1>
        </div>
        <p className="py-3 text-gray-11">{platform.description}</p>

        <section>
            <h2 className="pb-2 text-lg font-medium tracking-tight">Scratches ({platform.num_scratches})</h2>
            <ScratchList
                url={`/scratch?platform=${platform.id}&page_size=20`}
                item={ScratchItemPlatformList}
            />
        </section>
    </main>
}
