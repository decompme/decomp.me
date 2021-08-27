import { h, Fragment } from "preact"
import { useState, useEffect } from "preact/hooks"
import { useParams } from "react-router-dom"
import useSWR from "swr"

import * as api from "../api"
import Nav from "../Nav"
import Unimplemented from "../Unimplemented"

import styles from "./UserPage.module.css"

export default function UserPage() {
    const { username } = useParams<{ username: string }>()
    const { data: user, error } = useSWR<api.FullUser>(`/user/${username}`, api.get)

    const [currentUser, setCurrentUser] = useState<api.AnonymousUser>(null)
    const isCurrentUser = currentUser?.id === user?.id

    useEffect(() => {
        document.title = user?.name ? `${user.name} on decomp.me` : `${username} on decomp.me`
    }, [username, user?.name])

    if (user) {
        return <>
            <Nav onUserChange={setCurrentUser} />
            <main class={styles.pageContainer}>
                <section class={styles.userRow}>
                    <img
                        class={styles.avatar}
                        src={user.avatar_url}
                        alt="User avatar"
                    />
                    <h1 class={styles.name}>
                        <div>{user.name} </div>
                        <a href={`https://github.com/${user.username}`} class={styles.username}>
                            {user.username} {isCurrentUser && "(you)"}
                        </a>
                    </h1>
                </section>

                <section>
                    <h2>Scratches</h2>
                    <ScratchList user={user} />
                </section>
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

export function ScratchList({ user }: { user: api.FullUser }) {
    // TODO: needs backend
    void user

    /*
    const { data: scratches, error } = useSWR<api.Scratch[]>(`/user/${user.username}/scratches`, api.get)

    if (scratches) {
        return <ul class={styles.scratchList}>
            {scratches.map(scratch => <li key={scratch.id}>
                <ScratchLink scratch={scratch} />
            </li>)}
        </ul>
    }
    */

    return <Unimplemented issue="105" />
}
