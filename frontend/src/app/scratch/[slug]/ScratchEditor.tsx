"use client"

import { useEffect, useState } from "react"

import useSWR, { Middleware, SWRConfig } from "swr"

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

function ScratchEditorInner({ initialScratch, parentScratch, initialCompilation, offline }: Props) {
    const [scratch, setScratch] = useState(initialScratch)

    useWarnBeforeScratchUnload(scratch)

    // If the static props scratch changes (i.e. router push / page redirect), reset `scratch`.
    if (scratch.url !== initialScratch.url)
        setScratch(initialScratch)

    // If the server scratch owner changes (i.e. scratch was claimed), update local scratch owner.
    // You can trigger this by:
    // 1. Logging out
    // 2. Creating a new scratch
    // 3. Logging in
    // 4. Notice the scratch owner (in the About panel) has changed to your newly-logged-in user
    const ownerMayChange = !scratch.owner || scratch.owner.is_anonymous
    const cached = useSWR<api.Scratch>(ownerMayChange && scratch.url, api.get)?.data
    if (ownerMayChange && cached?.owner && !api.isUserEq(scratch.owner, cached?.owner)) {
        console.info("Scratch owner updated", cached.owner)
        setScratch(scratch => ({ ...scratch, owner: cached.owner }))
    }

    // On initial page load, request the latest scratch from the server, and
    // update `scratch` if it's newer.
    // This can happen when navigating back to a scratch page that was already loaded, but
    // was updated, so the originally-loaded initialScratch prop becomes stale.
    // https://github.com/decompme/decomp.me/issues/711
    useEffect(() => {
        api.get(scratch.url).then((updatedScratch: api.Scratch) => {
            const updateTime = new Date(updatedScratch.last_updated)
            const scratchTime = new Date(scratch.last_updated)

            if (scratchTime < updateTime) {
                console.info("Client got updated scratch", updatedScratch)
                setScratch(updatedScratch)
            }
        })
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return <>
        <ScratchPageTitle scratch={scratch} />
        <main className="grow">
            <Scratch
                scratch={scratch}
                parentScratch={parentScratch}
                initialCompilation={initialCompilation}
                onChange={partial => {
                    setScratch(scratch => {
                        return { ...scratch, ...partial }
                    })
                }}
                offline={offline}
            />
        </main>
    </>
}

export interface Props {
    initialScratch: api.Scratch
    parentScratch?: api.Scratch
    initialCompilation?: api.Compilation
    offline?: boolean
}

export default function ScratchEditor(props: Props) {
    const [offline, setOffline] = useState(false)

    const offlineMiddleware: Middleware = _useSWRNext => {
        return (key, fetcher, config) => {
            let swr = _useSWRNext(key, fetcher, config)

            if (swr.error instanceof api.RequestFailedError) {
                setOffline(true)
                swr = Object.assign({}, swr, { error: null })
            }

            return swr
        }
    }

    const onSuccess = () => {
        setOffline(false)
    }

    return <>
        <SWRConfig value={{ use: [offlineMiddleware], onSuccess }}>
            <ScratchEditorInner {...props} offline={offline} />
        </SWRConfig>
    </>
}
