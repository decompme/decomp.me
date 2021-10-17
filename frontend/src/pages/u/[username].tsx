import { GetStaticProps } from "next"

import Head from "next/head"
import Image from "next/image"
import { useRouter } from "next/router"

import { MarkGithubIcon } from "@primer/octicons-react"
import useSWR, { useSWRConfig } from "swr"

import AsyncButton from "../../components/AsyncButton"
import Footer from "../../components/Footer"
import LoadingSpinner from "../../components/loading.svg"
import Nav from "../../components/Nav"
import * as api from "../../lib/api"

import styles from "./[username].module.css"

// dynamically render all pages
export async function getStaticPaths() {
    return {
        paths: [],
        fallback: "blocking",
    }
}

export const getStaticProps: GetStaticProps = async context => {
    const { username } = context.params

    try {
        const user: api.User = await api.get(`/users/${username}`)

        return {
            props: {
                user,
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

export default function UserPage({ user: initialUser }: { user: api.User }) {
    const { mutate } = useSWRConfig()
    const router = useRouter()
    const { username } = router.query
    const { data: user, error } = useSWR<api.User>(`/users/${initialUser.username}`, api.get, {
        fallback: initialUser,
    })

    const signOut = async () => {
        api.post("/user", {})
            .then((user: api.AnonymousUser) => {
                mutate("/user", user)
                mutate(`/users/${username}`)
            })
    }

    if (error)
        console.error(error)

    if (!user) {
        // shouldn't show up in prod because fallback="blocking"
        return <>
            <Nav />
            <main className={styles.loadingPage}>
                <LoadingSpinner width="24px" />
            </main>
        </>
    }

    const title = [
        user.username,
        user.name && `(${user.name})`,
    ].filter(Boolean).join(" ")

    return <>
        <Head>
            <title>{title} | decomp.me</title>
        </Head>
        <Nav />
        <main className={styles.pageContainer}>
            <section className={styles.userRow}>
                {user.avatar_url && <Image
                    className={styles.avatar}
                    src={user.avatar_url}
                    alt="User avatar"
                    width={64}
                    height={64}
                />}
                <h1 className={styles.name}>
                    <div>{user.name}</div>
                    <div className={styles.username}>
                        @{user.username}

                        {user.github_html_url && <a href={user.github_html_url}>
                            <MarkGithubIcon size={24} />
                        </a>}
                    </div>
                </h1>
            </section>

            {/*<section>
                <h2>Scratches</h2>
                <ScratchList user={user} />
            </section>*/}

            {user.is_you && <section>
                <AsyncButton onClick={signOut}>
                    Sign out
                </AsyncButton>
            </section>}
        </main>
        <Footer />
    </>
}

// TODO: needs backend
/*
export function ScratchList({ user }: { user: api.User }) {
    const { data: scratches, error } = useSWR<api.Scratch[]>(`/user/${user.username}/scratches`, api.get)

    if (scratches) {
        return <ul className={styles.scratchList}>
            {scratches.map(scratch => <li key={scratch.id}>
                <ScratchLink scratch={scratch} />
            </li>)}
        </ul>
    }
}
*/
