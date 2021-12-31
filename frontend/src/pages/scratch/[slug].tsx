import { Suspense, useState } from "react"

import { GetServerSideProps } from "next"

import useSWR from "swr"

import LoadingSpinner from "../../components/loading.svg"
import Nav from "../../components/Nav"
import PageTitle from "../../components/PageTitle"
import Scratch from "../../components/Scratch"
import useSaveShortcut from "../../components/Scratch/hooks/useSaveShortcut"
import useWarnBeforeScratchUnload from "../../components/Scratch/hooks/useWarnBeforeScratchUnload"
import * as api from "../../lib/api"

import styles from "./[slug].module.scss"

function ScratchPageTitle({ scratch }: { scratch: api.Scratch }) {
    const isSaved = api.useIsScratchSaved(scratch)

    let title = scratch.name || "Untitled scratch"
    if (!isSaved)
        title += " (unsaved)"

    let description = `Score: ${scratch.score}`
    if (scratch.score === 0)
        description += " (matching!)"
    if (scratch.description)
        description += `\n\n${scratch.description}`

    return <PageTitle title={title} description={description} />
}

export const getServerSideProps: GetServerSideProps = async context => {
    const { slug } = context.params

    try {
        // TODO: pass along context.req.cookies
        const initialScratch: api.Scratch = await api.get(`/scratch/${slug}`)

        return {
            props: {
                initialScratch,
            },
        }
    } catch (error) {
        return {
            notFound: true,
        }
    }
}

export default function ScratchPage({ initialScratch }: { initialScratch: api.Scratch }) {
    const [scratch, setScratch] = useState(initialScratch)

    useSaveShortcut(scratch)
    useWarnBeforeScratchUnload(scratch)

    // If the static props scratch changes (i.e. router push / page redirect), reset `scratch`.
    if (scratch.slug !== initialScratch.slug)
        setScratch(initialScratch)

    // If the server scratch owner changes (i.e. scratch was claimed), update local scratch owner.
    // You can trigger this by:
    // 1. Logging out
    // 2. Creating a new scratch
    // 3. Logging in
    // 4. Notice the scratch owner (in the About panel) has changed to your newly-logged-in user
    const ownerMayChange = !scratch.owner || scratch.owner.is_anonymous
    const cached = useSWR<api.Scratch>(ownerMayChange && `/scratch/${scratch.slug}`, api.get)?.data
    if (ownerMayChange && cached?.owner && !api.isUserEq(scratch.owner, cached?.owner)) {
        console.info("Scratch owner updated", cached.owner)
        setScratch(scratch => ({ ...scratch, owner: cached.owner }))
    }

    return <>
        <ScratchPageTitle scratch={scratch} />
        <Nav />
        <main className={styles.container}>
            <Suspense fallback={<LoadingSpinner className={styles.loading} />}>
                <Scratch
                    scratch={scratch}
                    onChange={partial => {
                        setScratch(scratch => {
                            return { ...scratch, ...partial }
                        })
                    }}
                />
            </Suspense>
        </main>
    </>
}
