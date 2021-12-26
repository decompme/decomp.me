import { Suspense } from "react"

import { GetStaticProps } from "next"

import Head from "next/head"

import LoadingSpinner from "../../components/loading.svg"
import Nav from "../../components/Nav"
import TrainingScratch from "../../components/Scratch/training/TrainingScratch"
import * as api from "../../lib/api"
import { useFinishedTraining } from "../../lib/training"

import styles from "./[slug].module.scss"

// dynamically render all pages
export async function getStaticPaths() {
    return {
        paths: [],
        fallback: true,
    }
}

export const getStaticProps: GetStaticProps = async context => {
    const { slug } = context.params

    try {
        const scratch: api.Scratch = await api.get(`/scratch/${slug}?no_take_ownership`)

        return {
            props: {
                scratch,
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

export default function TrainingScratchPage({ scratch }: { scratch?: api.Scratch }) {
    const [,,addFinishedTraining] = useFinishedTraining()

    return <>
        <Head>
            <title>{scratch ? scratch.name : "Training"} | decomp.me</title>
        </Head>
        <Nav />
        <main className={styles.container}>
            <Suspense fallback={<LoadingSpinner className={styles.loading} />}>
                {scratch && <TrainingScratch onMatch={() => addFinishedTraining(scratch.slug)} slug={scratch.slug} tryClaim={true} />}
                {scratch === undefined && <LoadingSpinner className={styles.loading} />}
            </Suspense>
        </main>
    </>
}
