import Link from "next/link"

import * as api from "../../lib/api"

import UserAvatar from "./UserAvatar"
import styles from "./UserLink.module.scss"

export function GitHubUserLink({ user }: { user: { login: string } }) {
    return <Link href={`https://github.com/${user.login}`}>
        <a className={styles.user}>
            <span>{user.login}</span>
        </a>
    </Link>
}

export type Props = {
    user: api.User | api.AnonymousUser
    showUsername?: boolean // default = true
}

export default function UserLink({ user, showUsername }: Props) {
    const userIsYou = api.useUserIsYou()

    if (api.isAnonUser(user)) {
        return <a className={styles.user}>
            <UserAvatar user={user} />
            <span>{userIsYou(user) ? "anon (you)" : "anon"}</span>
        </a>
    } else {
        return <Link href={`/u/${user.username}`}>
            <a className={styles.user}>
                <UserAvatar user={user} />
                {showUsername != false && <span>{user.username}</span>}
            </a>
        </Link>
    }
}
