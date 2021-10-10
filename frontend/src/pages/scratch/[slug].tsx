import Head from "next/head"

import * as api from "../../api"
import Nav from "../../components/Nav"
import Scratch, { nameScratch } from "../../components/scratch/Scratch"

// dynamically render all pages
export async function getStaticPaths() {
    return {
        paths: [],
        fallback: true,
    }
}

export async function getStaticProps(context) {
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
        <main>
            {scratch && <Scratch scratch={scratch} />}
            {scratch === undefined && <h1>Loading...</h1> /* TODO */}
        </main>
    </>
}
