import { Link } from "react-router-dom"

import * as api from "../api"

import styles from "./UserLink.module.css"

export type Props = {
    user: api.User | api.AnonymousUser,
    hideYou?: boolean,
}

export default function UserLink({ user, hideYou }: Props) {
    if (api.isAnonUser(user)) {
        return <a className={styles.user}>
            <span>{user.is_you ? "you" : "anon" }</span>
        </a>
    } else {
        return <Link
            to={`/~${user.username}`}
            title={`@${user.username}`}
            className={styles.user}
        >
            {user.avatar_url && <img className={styles.avatar} src={user.avatar_url} alt="User avatar" />}
            <span>{user.name} {!hideYou && user.is_you && <i>(you)</i>}</span>
        </Link>
    }
}
