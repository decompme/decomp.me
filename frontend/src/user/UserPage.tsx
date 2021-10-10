import { useEffect } from "react"
import { useParams } from "react-router-dom"
import useSWR, { useSWRConfig } from "swr"
import { MarkGithubIcon } from "@primer/octicons-react"

import * as api from "../api"
import Nav from "../Nav"

import styles from "./UserPage.module.css"

export default function UserPage() {
    const { mutate } = useSWRConfig()
    const { username } = useParams<{ username: string }>()
    const { data, error } = useSWR<api.User>(`/users/${username}`, api.get)
    const user = data

    useEffect(() => {
        document.title = user?.name ? `${user.name} | decomp.me` : `@${username} | decomp.me`
    }, [username, user?.name])

    const signOut = () => {
        api.post("/user", {})
            .then((user: api.AnonymousUser) => {
                mutate("/user", user)
                mutate(`/users/${username}`)
            })
            .catch(console.error)
    }

    if (user) {
        return <>
            <Nav />
            <main className={styles.pageContainer}>
                <section className={styles.userRow}>
                    {user.avatar_url && <img
                        className={styles.avatar}
                        src={user.avatar_url}
                        alt="User avatar"
                    />}
                    <h1 className={styles.name}>
                        <div>{user.name} {user.is_you && <i>(you)</i>}</div>
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
                    <button className="red" onClick={signOut}>
                        Sign out
                    </button>
                </section>}
            </main>
        </>
    } else if (error) {
        // TODO: better error handling
        return <>
            <Nav />
            <main className={styles.pageContainer}>
                {error.toString()}
            </main>
        </>
    } else {
        // TODO: skeleton
        return <>
            <Nav />
            <main className={styles.pageContainer}>
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
        return <ul className={styles.scratchList}>
            {scratches.map(scratch => <li key={scratch.id}>
                <ScratchLink scratch={scratch} />
            </li>)}
        </ul>
    }
}
*/
