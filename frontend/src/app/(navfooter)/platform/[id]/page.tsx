import { notFound } from "next/navigation"

import { PlatformIcon } from "@/components/PlatformSelect/PlatformIcon"
import ScratchList, { ScratchItemPresetList } from "@/components/ScratchList"
import { get } from "@/lib/api/request"
import { PlatformMetadata } from "@/lib/api/types"

export async function generateMetadata({ params }: { params: { id: number } }) {
    let platform: PlatformMetadata

    try {
        platform = await get(`/platform/${params.id}`)
    } catch (error) {
        console.error(error)
    }

    if (!platform) {
        return notFound()
    }

    return {
        title: platform.name,
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
                url={"/scratch?platform=" + platform.id + "&page_size=20"}
                item={ScratchItemPresetList}
            />
        </section>
    </main>
}
