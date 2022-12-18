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
    const linkInner = <a className={styles.user}>
        <UserAvatar user={user} />
        {showUsername != false && <span>{user.username}</span>}
    </a>

    return api.isAnonUser(user) ? linkInner : <Link href={`/u/${user.username}`}>{linkInner}</Link>
}
