import { useEffect, useState } from "react"

import Image from "next/future/image"

import classNames from "classnames"

import * as api from "../../lib/api"

import AnonymousFrogAvatar from "./AnonymousFrog"
import styles from "./UserAvatar.module.scss"

export type Props = {
    user: api.User | api.AnonymousUser
    className?: string
}

export default function UserAvatar({ user, className }: Props) {
    const userIsYou = api.useUserIsYou()

    // Avoid hydration mismatch
    const [isMounted, setIsMounted] = useState(false)
    useEffect(() => setIsMounted(true), [])

    return <span className={classNames(styles.avatar, className)}>
        {api.isAnonUser(user) ? <AnonymousFrogAvatar user={user}/> : user.avatar_url && <Image src={user.avatar_url} alt="" fill sizes="64px" />}
        {isMounted && !userIsYou(user) && user.is_online && <div className={styles.online} title="Online" />}
    </span>
}
