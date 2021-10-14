import Image from "next/image"
import Link from "next/link"

import * as api from "../../lib/api"

import styles from "./UserLink.module.css"

export function GitHubUserLink({ user }: { user: { login: string, avatar_url?: string } }) {
    return <Link href={`https://github.com/${user.login}`}>
        <a className={styles.user}>
            {user.avatar_url && <Image className={styles.avatar} src={user.avatar_url} alt="User avatar" width={24} height={24} />}
            <span>{user.login}</span>
        </a>
    </Link>
}


export type Props = {
    user: api.User | api.AnonymousUser
}

export default function UserLink({ user }: Props) {
    if (api.isAnonUser(user)) {
        return <a className={styles.user}>
            <span>{user.is_you ? "You" : "Anonymous" }</span>
        </a>
    } else {
        return <Link href={`/u/${user.username}`}>
            <a className={styles.user}>
                {user.avatar_url && <Image className={styles.avatar} src={user.avatar_url} alt="User avatar" width={24} height={24} />}
                <span>{user.username}</span>
            </a>
        </Link>
    }
}
