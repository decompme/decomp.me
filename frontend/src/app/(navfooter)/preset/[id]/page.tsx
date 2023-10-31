import { notFound } from "next/navigation"

import PlatformIcon from "@/components/PlatformSelect/PlatformIcon"
import ScratchList, { ScratchItemPresetList } from "@/components/ScratchList"
import { get } from "@/lib/api/request"
import { Preset } from "@/lib/api/types"
import useTranslation from "@/lib/i18n/translate"

import styles from "./page.module.scss"

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
        <div className={styles.header}>
            <PlatformIcon platform={preset.platform} size={32} />
            <p className={styles.name}>
                {preset.name}
            </p>
        </div>
        <p>Compiler: {compilerName}</p>

        <section>
            <h2 className="pb-2 text-lg font-medium tracking-tight">Scratches</h2>
            <ScratchList
                url={"/scratch?preset=" + preset.id + "&page_size=32"}
                item={ScratchItemPresetList}
            />
        </section>
    </main>
}
