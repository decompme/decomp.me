import { notFound } from "next/navigation"

import { PlatformIcon } from "@/components/PlatformSelect/PlatformIcon"
import ScratchList, { ScratchItemPresetList } from "@/components/ScratchList"
import { get } from "@/lib/api/request"
import { Preset } from "@/lib/api/types"
import useTranslation from "@/lib/i18n/translate"

export async function generateMetadata({ params }: { params: { id: number } }) {
    let preset: Preset

    try {
        preset = await get(`/preset/${params.id}`)
    } catch (error) {
        console.error(error)
    }

    if (!preset) {
        return notFound()
    }

    return {
        title: preset.name,
    }
}

export default async function Page({ params }: { params: { id: number } }) {
    const compilersTranslation = useTranslation("compilers")

    let preset: Preset
    try {
        preset = await get(`/preset/${params.id}`)
    } catch (error) {
        console.error(error)
    }

    if (!preset) {
        return notFound()
    }

    const compilerName = compilersTranslation.t(preset.compiler)

    return <main className="mx-auto w-full max-w-3xl p-4">
        <div className="flex items-center gap-2 text-2xl font-medium">
            <PlatformIcon platform={preset.platform} size={32} />
            <h1>
                {preset.name}
            </h1>
        </div>
        <p className="py-3 text-gray-11">{compilerName}</p>

        <section>
            <h2 className="pb-2 text-lg font-medium tracking-tight">Scratches ({preset.num_scratches})</h2>
            <ScratchList
                url={"/scratch?preset=" + preset.id + "&page_size=20"}
                item={ScratchItemPresetList}
            />
        </section>
    </main>
}
