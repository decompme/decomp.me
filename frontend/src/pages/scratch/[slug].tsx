import { Suspense, useState } from "react"

import { GetStaticProps } from "next"

import Head from "next/head"

import LoadingSpinner from "../../components/loading.svg"
import Nav from "../../components/Nav"
import useSaveShortcut from "../../components/Scratch/hooks/useSaveShortcut"
import useScratchDocumentTitle from "../../components/Scratch/hooks/useScratchDocumentTitle"
import useWarnBeforeScratchUnload from "../../components/Scratch/hooks/useWarnBeforeScratchUnload"
import * as api from "../../lib/api"

import styles from "./[slug].module.scss"

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
    const [isSaved, setIsSaved] = useState(false)

    useSaveShortcut(scratch)
    useScratchDocumentTitle(scratch)
    useWarnBeforeScratchUnload(scratch)

    return <>
        <Head>
            <title>{scratch.name || "Untitled scratch"} | decomp.me</title>
            <meta name="description" content={`Score: ${scratch.score}`} />
        </Head>
        <Nav />
        <main className={styles.container}>
            <Suspense fallback={<LoadingSpinner className={styles.loading} />}>
                <Scratch
                    scratch={scratch}
                    isSaved={isSaved}
                    onChange={partial => {
                        setScratch({ ...scratch, ...partial })
                        setIsSaved(false)
                    }}
                />
            </Suspense>
        </main>
    </>
}
