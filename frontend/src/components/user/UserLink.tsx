import Image from "next/image"
import Link from "next/link"

import * as api from "../../api"

import styles from "./UserLink.module.css"

export type Props = {
    user: api.User | api.AnonymousUser,
}

export default function UserLink({ user }: Props) {
    if (api.isAnonUser(user)) {
        return <a className={styles.user}>
            <span>{user.is_you ? "you" : "anon" }</span>
        </a>
    } else {
        return <Link href={`/u/${user.username}`}>
            <a title={`@${user.username}`} className={styles.user}>
                {user.avatar_url && <Image className={styles.avatar} src={user.avatar_url} alt="User avatar" width={24} height={24} />}
                <span>{user.name} {user.is_you && <i>(you)</i>}</span>
            </a>
        </Link>
    }
}
