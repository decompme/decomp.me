import { GetStaticProps } from "next"

import Head from "next/head"

import LoadingSpinner from "../../components/loading.svg"
import Nav from "../../components/Nav"
import Scratch, { nameScratch } from "../../components/scratch/Scratch"
import * as api from "../../lib/api"

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

export default function ScratchPage({ scratch }: { scratch?: api.Scratch }) {
    return <>
        <Head>
            <title>{scratch ? nameScratch(scratch) : "Loading scratch"} | decomp.me</title>
        </Head>
        <Nav />
        <main className={styles.container}>
            {scratch && <Scratch scratch={scratch} />}
            {scratch === undefined && <LoadingSpinner className={styles.loading} />}
        </main>
    </>
}
