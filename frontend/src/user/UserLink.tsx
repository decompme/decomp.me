import { h } from "preact"
import useSWR from "swr"
import { Link } from "react-router-dom"

import * as api from "../api"

import styles from "./UserLink.module.css"

export type Props = {
    username: string,
    hideYou?: boolean,
}

export default function UserCard({ username, hideYou }: Props) {
    const { data, error } = useSWR<{ user: api.User }>(`/users/${username}`, api.get)
    const user = data?.user

    if (user) {
        return <Link
            to={`/~${user.username}`}
            title={`@${user.username}`}
            className={styles.user}
        >
            {user.avatar_url && <img class={styles.avatar} src={user.avatar_url} alt="User avatar" />}
            <span>{user.name} {!hideYou && user.is_you && <i>(you)</i>}</span>
        </Link>
    } else if (error) {
        // TODO: handle error
        return <div>error</div>
    } else {
        // TODO: loading state
        return <div className={styles.user}>
            <span>{username}</span>
        </div>
    }
}
