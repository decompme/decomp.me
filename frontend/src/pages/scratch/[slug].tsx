import { useEffect, useState } from "react"

import { GetStaticProps, GetStaticPaths } from "next"

import Head from "next/head"
import { useRouter } from "next/router"

import { dequal } from "dequal"

import LoadingSpinner from "../../components/loading.svg"
import Nav from "../../components/Nav"
import Scratch from "../../components/Scratch"
import * as api from "../../lib/api"
import { useWarnBeforeUnload } from "../../lib/hooks"

import styles from "./[slug].module.scss"

function describeScratchScore(score: number): string {
    switch (score) {
    case -1:
        return "Fails to compile"
    case 0:
        return "Match!"
    default:
        return `Diff score: ${score}`
    }
}

function isScratchModified(local: api.Scratch, server: api.Scratch): boolean {
    const mutableProperties = [
        "source_code",
        "context",
        "compiler",
        "compiler_flags",
        "name",
        "description",
    ]

    for (const prop of mutableProperties) {
        if (local[prop] !== server[prop]) {
            console.debug(`scratch.${prop} modified`)
            return true
        }
    }

    return false
}

// dynamically render all pages
export const getStaticPaths: GetStaticPaths = async () => {
    return {
        paths: [],
        fallback: "blocking",
    }
}

export const getStaticProps: GetStaticProps = async context => {
    const { slug } = context.params

    try {
        const scratch: api.Scratch = await api.get(`/scratch/${slug}`)

        return {
            props: {
                initialScratch: scratch,
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

export default function ScratchPage({ initialScratch }: { initialScratch?: api.Scratch }) {
    const router = useRouter()
    const { scratch: serverScratch, save, fork, claim } = api.useScratch(initialScratch)
    const [isRedirecting, setIsRedirecting] = useState(false)
    const [scratch, setScratch] = useState(initialScratch)
    const [isModified, setIsModified] = useState(false)

    useWarnBeforeUnload(
        isModified && !isRedirecting,
        scratch?.owner?.is_you
            ? "You have not saved your changes to this scratch. Discard changes?"
            : "You have edited this scratch but not saved it in a fork. Discard changes?",
    )

    // Keybindings.
    useEffect(() => {
        const handler = async (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key == "s") {
                event.preventDefault()

                if (!scratch.owner || (isModified && scratch.owner?.is_you)) {
                    if (!scratch.owner)
                        await claim()
                    await save(scratch)
                }
            }
        }

        document.addEventListener("keydown", handler)
        return () => document.removeEventListener("keydown", handler)
    })

    // If the scratch is not modified, use the latest data.     (auto-updating)
    // If the server slug changes, reset to the server scratch. (routing)
    if ((!isModified && !dequal(scratch, serverScratch)) || serverScratch.slug !== scratch.slug) {
        console.info("Updated scratch to latest API data")
        setScratch(serverScratch)
        setIsModified(false)
    }

    const title = [
        scratch?.name || "Untitled scratch",
        isModified && "(unsaved)",
        scratch?.owner && !api.isAnonUser(scratch?.owner) && `- ${scratch?.owner?.username}`,
    ].filter(Boolean).join(" ")

    return <>
        <Head>
            <title>{title} | decomp.me</title>
            <meta property="og:type" content="article" />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={describeScratchScore(scratch.score)} />
        </Head>
        <Nav />
        <main className={styles.container}>
            {scratch
                ? <Scratch
                    scratch={scratch}
                    isSaved={!isModified}
                    onChange={newScratch => {
                        setScratch(newScratch)
                        setIsModified(isScratchModified(newScratch, serverScratch))
                    }}
                    onSave={async () => {
                        // Save the current state to the server
                        await save(scratch)
                    }}
                    onFork={async () => {
                        // Fork, then go to the new scratch
                        const newScratch = await fork(scratch)
                        setIsRedirecting(true)
                        await router.push(`/scratch/${newScratch.slug}`)
                    }}
                />
                : <LoadingSpinner className={styles.loading} />
            }
        </main>
    </>
}
