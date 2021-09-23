import { h, Fragment } from "preact"
import { useEffect } from "preact/hooks"
import { useParams } from "react-router-dom"
import useSWR, { useSWRConfig } from "swr"
import { MarkGithubIcon } from "@primer/octicons-react"

import * as api from "../api"
import Nav from "../Nav"

import styles from "./UserPage.module.css"

export default function UserPage() {
    const { mutate } = useSWRConfig()
    const { username } = useParams<{ username: string }>()
    const { data, error } = useSWR<{ user: api.User }>(`/users/${username}`, api.get)
    const user = data?.user

    useEffect(() => {
        document.title = user?.name ? `${user.name} | decomp.me` : `@${username} | decomp.me`
    }, [username, user?.name])

    const signOut = () => {
        api.post("/user", {})
            .then(({ user }: { user: api.AnonymousUser }) => {
                mutate("/user", { user })
                mutate(`/users/${username}`)
            })
            .catch(console.error)
    }

    if (user) {
        return <>
            <Nav />
            <main class={styles.pageContainer}>
                <section class={styles.userRow}>
                    {user.avatar_url && <img
                        class={styles.avatar}
                        src={user.avatar_url}
                        alt="User avatar"
                    />}
                    <h1 class={styles.name}>
                        <div>{user.name} {user.is_you && <i>(you)</i>}</div>
                        <div class={styles.username}>
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
                    <button class="red" onClick={signOut}>
                        Sign out
                    </button>
                </section>}
            </main>
        </>
    } else if (error) {
        // TODO: better error handling
        return <>
            <Nav />
            <main class={styles.pageContainer}>
                {error}
            </main>
        </>
    } else {
        // TODO: skeleton
        return <>
            <Nav />
            <main class={styles.pageContainer}>
                Loading...
            </main>
        </>
    }
}

// TODO: needs backend
/*
export function ScratchList({ user }: { user: api.User }) {
    const { data: scratches, error } = useSWR<api.Scratch[]>(`/user/${user.username}/scratches`, api.get)

    if (scratches) {
        return <ul class={styles.scratchList}>
            {scratches.map(scratch => <li key={scratch.id}>
                <ScratchLink scratch={scratch} />
            </li>)}
        </ul>
    }
}
*/
