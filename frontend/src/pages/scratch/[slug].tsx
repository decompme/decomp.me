import { Suspense, useState } from "react"

import { GetStaticProps } from "next"

import { useSWRConfig } from "swr"

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

// dynamically render all pages
export async function getStaticPaths() {
    return {
        paths: [],
        fallback: "blocking",
    }
}

export const getStaticProps: GetStaticProps = async context => {
    const { slug } = context.params

    try {
        const initialScratch: api.Scratch = await api.get(`/scratch/${slug}`)

        return {
            props: {
                initialScratch,
            },
            revalidate: 10,
        }
    } catch (error) {
        return {
            notFound: true,
            revalidate: 10,
        }
    }
}

export default function ScratchPage({ initialScratch }: { initialScratch: api.Scratch }) {
    const [scratch, setScratch] = useState(initialScratch)

    useSaveShortcut(scratch)
    useWarnBeforeScratchUnload(scratch)

    // If the static props scratch changes (i.e. router push / page redirect), reset `scratch`
    if (scratch.slug !== initialScratch.slug)
        setScratch(initialScratch)

    // If the SWR cache scratch owner changes (i.e. scratch was claimed), update local scratch owner
    const { cache } = useSWRConfig()
    const cached = cache.get(`/scratch/${scratch.slug}`) as api.Scratch
    if (!scratch.owner && cached?.owner)
        setScratch(scratch => ({ ...scratch, owner: cached.owner }))

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
