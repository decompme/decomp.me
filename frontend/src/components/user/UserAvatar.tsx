import Image from "next/image"

import classNames from "classnames"

import * as api from "../../lib/api"

import styles from "./UserAvatar.module.scss"

export type Props = {
    user: api.User | api.AnonymousUser
    className?: string
}

export default function UserAvatar({ user, className }: Props) {
    return <div className={classNames(styles.avatar, className)}>
        {!api.isAnonUser(user) && user.avatar_url && <Image src={user.avatar_url} alt="" layout="fill" />}
        {user.is_online && <div className={styles.online} title="Online" />}
    </div>
}
