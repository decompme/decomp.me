import { notFound } from "next/navigation"

import PlatformIcon from "@/components/PlatformSelect/PlatformIcon"
import ScratchList, { ScratchItemNoOwner } from "@/components/ScratchList"
import { get } from "@/lib/api/request"
import { Platform } from "@/lib/api/types"

import styles from "./page.module.scss"

export async function generateMetadata({ params }: { params: { id: number } }) {
    let platform: Platform

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
    let platform: Platform
    try {
        platform = await get(`/platform/${params.id}`)
    } catch (error) {
        console.error(error)
    }

    if (!platform) {
        return notFound()
    }

    return <main className="mx-auto w-full max-w-3xl p-4">
        <div className={styles.header}>
            <PlatformIcon platform={platform.id} size={32} />
            <p className={styles.name}>
                {platform.name}
            </p>
        </div>
        <p>{platform.description}</p>

        <section>
            <h2 className="pb-2 text-lg font-medium tracking-tight">Scratches</h2>
            <ScratchList
                url={"/scratch?platform=" + platform.id + "&page_size=32"}
                item={ScratchItemNoOwner}
            />
        </section>
    </main>
}
