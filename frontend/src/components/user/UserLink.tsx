import Link from "next/link"

import { isAnonUser, User, AnonymousUser } from "../../lib/api/types"

import UserAvatar from "./UserAvatar"
import styles from "./UserLink.module.scss"

export function GitHubUserLink({ user }: { user: { login: string } }) {
    return (
        <Link href={`https://github.com/${user.login}`} className={styles.user}>

            <span>{user.login}</span>

        </Link>
    )
}

export type Props = {
    user: User | AnonymousUser
    showUsername?: boolean // default = true
}

export default function UserLink({ user, showUsername }: Props) {
    const linkInner = <a className={styles.user}>
        <UserAvatar user={user} />
        {showUsername != false && <span>{user.username}</span>}
    </a>

    return isAnonUser(user) ? linkInner : <Link href={`/u/${user.username}`} legacyBehavior>{linkInner}</Link>
}
