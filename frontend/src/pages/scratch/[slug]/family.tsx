import { useState } from "react"

import { GetServerSideProps } from "next"

import Head from "next/head"

import Breadcrumbs from "@/components/Breadcrumbs"
import Footer from "@/components/Footer"
import Nav from "@/components/Nav"
import PageTitle from "@/components/PageTitle"
import { LoadedScratchList } from "@/components/ScratchList"
import Select from "@/components/Select2"
import UserAvatar from "@/components/user/UserAvatar"
import * as api from "@/lib/api"

import styles from "./family.module.scss"

enum SortMode {
    NEWEST_FIRST = "newest_first",
    OLDEST_FIRST = "oldest_first",
    LAST_UPDATED = "last_updated",
    SCORE = "score",
}

function produceSortFunction(sortMode: SortMode): (a: api.TerseScratch, b: api.TerseScratch) => number {
    switch (sortMode) {
    case SortMode.NEWEST_FIRST:
        return (a, b) => new Date(b.creation_time).getTime() - new Date(a.creation_time).getTime()
    case SortMode.OLDEST_FIRST:
        return (a, b) => new Date(a.creation_time).getTime() - new Date(b.creation_time).getTime()
    case SortMode.LAST_UPDATED:
        return (a, b) => new Date(a.last_updated).getTime() - new Date(b.last_updated).getTime()
    case SortMode.SCORE:
        return (a, b) => {
            const aScore = a.score == 0 ? Infinity : a.score
            const bScore = b.score == 0 ? Infinity : b.score

            return aScore - bScore
        }
    }
}

export const getServerSideProps: GetServerSideProps = async context => {
    const { slug } = context.params

    try {
        const scratch: api.Scratch = await api.get(`/scratch/${slug}`)
        const family: api.TerseScratch[] = await api.get(`/scratch/${slug}/family`)

        return {
            props: {
                scratch,
                family,
            },
        }
    } catch (error) {
        console.log(error)
        return {
            notFound: true,
        }
    }
}

export default function ScratchPage({ scratch, family }: { scratch: api.Scratch, family: api.TerseScratch[] }) {
    const [sortMode, setSortMode] = useState(SortMode.NEWEST_FIRST)

    // Sort family in-place
    family.sort(produceSortFunction(sortMode))

    return <>
        <Head><PageTitle
            title={`Family of '${scratch.name}'`}
            description={`${family.length} family member${family.length == 1 ? "" : "s"} (forks, parents, siblings)`}
        /></Head>
        <Nav />
        <header className={styles.header}>
            <div className={styles.container}>
                <Breadcrumbs pages={[
                    scratch.owner && {
                        label: <>
                            <UserAvatar user={scratch.owner} />
                            <span style={{ marginLeft: "6px" }} />
                            {scratch.owner.username}
                        </>,
                        href: `/u/${scratch.owner.username}`,
                    },
                    { label: scratch.name, href: scratch.url },
                    { label: "Family" },
                ].filter(Boolean)} />
            </div>
        </header>
        <main>
            <div className={styles.container}>
                <div className={styles.actions}>
                    <label>
                        Sort by
                        <Select
                            value={sortMode}
                            onChange={m => setSortMode(m as SortMode)}
                            options={{
                                [SortMode.NEWEST_FIRST]: "Newest first",
                                [SortMode.OLDEST_FIRST]: "Oldest first",
                                [SortMode.LAST_UPDATED]: "Last modified",
                                [SortMode.SCORE]: "Match completion",
                            }}
                        />
                    </label>
                </div>
                <LoadedScratchList scratches={family} />
            </div>
        </main>
        <Footer />
    </>
}
