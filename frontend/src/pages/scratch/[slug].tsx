import { Suspense, useState } from "react"

import { GetServerSideProps } from "next"

import useSWR from "swr"

import LoadingSpinner from "../../components/loading.svg"
import PageTitle from "../../components/PageTitle"
import { getScoreText } from "../../components/ScoreBadge"
import Scratch from "../../components/Scratch"
import useWarnBeforeScratchUnload from "../../components/Scratch/hooks/useWarnBeforeScratchUnload"
import * as api from "../../lib/api"

import styles from "./[slug].module.scss"

function ScratchPageTitle({ scratch, compilation }: { scratch: api.Scratch, compilation: api.Compilation }) {
    const isSaved = api.useIsScratchSaved(scratch)

    let title = scratch.name || "Untitled scratch"
    if (!isSaved)
        title += " (unsaved)"

    let description = `Score: ${getScoreText(compilation?.diff_output?.current_score ?? -1, compilation?.diff_output?.max_score ?? -1)}`
    if (scratch.owner && !api.isAnonUser(scratch.owner))
        description += `\nOwner: ${scratch.owner.username}`
    if (scratch.description)
        description += `\n\n${scratch.description}`

    return <PageTitle title={title} description={description} />
}

export const getServerSideProps: GetServerSideProps = async context => {
    const { slug } = context.params

    try {
        const scratch: api.Scratch = await api.get(`/scratch/${slug}`)

        let initialCompilation: api.Compilation | null = null
        try {
            initialCompilation = await api.post(`/scratch/${slug}/compile`, {
                // TODO(backend): api should take {}, supporting undefinedIfUnchanged on all fields
                compiler: scratch.compiler,
                compiler_flags: scratch.compiler_flags,
                source_code: scratch.source_code,
                context: undefined,
            })
        } catch (err) {
            if (err.status !== 400)
                throw err

            initialCompilation = null
        }

        return {
            props: {
                initialScratch: scratch,
                initialCompilation,
            },
        }
    } catch (error) {
        return {
            notFound: true,
        }
    }
}

export default function ScratchPage({ initialScratch, initialCompilation }: { initialScratch: api.Scratch, initialCompilation?: api.Compilation }) {
    const [scratch, setScratch] = useState(initialScratch)

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
        <ScratchPageTitle scratch={scratch} compilation={initialCompilation} />
        <main className={styles.container}>
            <Suspense fallback={<LoadingSpinner className={styles.loading} />}>
                <Scratch
                    scratch={scratch}
                    initialCompilation={initialCompilation}
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
