"use client"

import { useState, useEffect } from "react"

import useSWR from "swr"

import Scratch from "@/components/Scratch"
import useWarnBeforeScratchUnload from "@/components/Scratch/hooks/useWarnBeforeScratchUnload"
import SetPageTitle from "@/components/SetPageTitle"
import * as api from "@/lib/api"

import styles from "./ScratchEditor.module.scss"

function ScratchPageTitle({ scratch }: { scratch: api.Scratch }) {
    const isSaved = api.useIsScratchSaved(scratch)

    let title = isSaved ? "" : "(unsaved) "
    title += scratch.name || scratch.slug

    return <SetPageTitle title={title} />
}

export interface Props {
    initialScratch: api.Scratch
    parentScratch?: api.Scratch
    initialCompilation?: api.Compilation
}

export default function ScratchEditor({ initialScratch, parentScratch, initialCompilation }: Props) {
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

    // Disable page scrolling
    useEffect(() => {
        document.body.classList.add("no-scroll")
        return () => {
            document.body.classList.remove("no-scroll")
        }
    }, [])

    return <>
        <ScratchPageTitle scratch={scratch} />
        <main className={styles.container}>
            <Scratch
                scratch={scratch}
                parentScratch={parentScratch}
                initialCompilation={initialCompilation}
                onChange={partial => {
                    setScratch(scratch => {
                        return { ...scratch, ...partial }
                    })
                }}
            />
        </main>
    </>
}
