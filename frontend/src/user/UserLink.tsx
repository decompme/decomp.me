import { h } from "preact"
import useSWR from "swr"
import { Link } from "react-router-dom"

import * as api from "../api"
import { FullUser } from "./userTypes"

import styles from "./UserLink.module.css"

export type Props = {
    username: string,
}

export default function UserCard({ username }: Props) {
    const { data: user, error } = useSWR<FullUser>(`/user/${username}`, api.get)

    if (user) {
        return <Link
            to={`/~${user.username}`}
            title={`@${user.username}`}
            className={styles.user}
        >
            <img class={styles.avatar} src={user.avatar_url} alt="User avatar" />
            <span>{user.name}</span>
        </Link>
    } else if (error) {
        // TODO: handle error
        return <div>error</div>
    } else {
        // TODO: loading state
        return <div className={styles.user}>
            <span>@{username}</span>
        </div>
    }
}
