"use client"

import { useState } from "react"

import useSWR, { Revalidator, RevalidatorOptions, SWRConfig } from "swr"

import Scratch from "@/components/Scratch"
import useWarnBeforeScratchUnload from "@/components/Scratch/hooks/useWarnBeforeScratchUnload"
import SetPageTitle from "@/components/SetPageTitle"
import * as api from "@/lib/api"

function ScratchPageTitle({ scratch }: { scratch: api.Scratch }) {
    const isSaved = api.useIsScratchSaved(scratch)

    let title = isSaved ? "" : "(unsaved) "
    title += scratch.name || scratch.slug

    return <SetPageTitle title={title} />
}

export function ScratchEditor({ slug, offline }: {slug: string, offline: boolean}) {
    const { data: scratch, mutate: mutateScratch } = useSWR<api.Scratch>(`/scratch/${slug}`, api.get)
    const { data: parentScratch } = useSWR<api.Scratch>(() => scratch.parent, api.get)
    const { data: compilation } = useSWR<api.Compilation>(() => `${scratch.url}/compile`, api.get)

    useWarnBeforeScratchUnload(scratch)

    // If the static props scratch changes (i.e. router push / page redirect), reset `scratch`.
    // TODO: check no regression!

    // If the server scratch owner changes (i.e. scratch was claimed), update local scratch owner.
    // You can trigger this by:
    // 1. Logging out
    // 2. Creating a new scratch
    // 3. Logging in
    // 4. Notice the scratch owner (in the About panel) has changed to your newly-logged-in user
    // TODO: ... reimplement :(

    // On initial page load, request the latest scratch from the server, and
    // update `scratch` if it's newer.
    // This can happen when navigating back to a scratch page that was already loaded, but
    // was updated, so the originally-loaded initialScratch prop becomes stale.
    // https://github.com/decompme/decomp.me/issues/711
    // TODO: check no regression!

    return <>
        <ScratchPageTitle scratch={scratch} />
        <main className="grow">
            <Scratch
                scratch={scratch}
                parentScratch={parentScratch}
                initialCompilation={compilation}
                onChange={partial => {
                    mutateScratch({ ...scratch, ...partial })
                }}
                offline={offline}
            />
        </main>
    </>
}

export default function ScratchPage({ slug, fallback }: {slug: string, fallback: object}) {
    const [offline, setOffline] = useState(false)

    function onErrorRetry<C>(error: any, key: string, config: C, revalidate: Revalidator, { retryCount }: RevalidatorOptions) {
        if (error.status === 404) return
        if (retryCount >= 10) return

        setOffline(true)

        // Retry after 5 seconds
        setTimeout(() => revalidate({ retryCount }), 5000)
    }

    function onSuccess() {
        setOffline(false)
    }

    //return <SWRConfig value={{ fallback, onErrorRetry, onSuccess }}>
    return <ScratchEditor slug={slug} offline={offline} />
    //</SWRConfig>
}
