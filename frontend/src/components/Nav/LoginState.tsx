import { useEffect } from "react"

import Image from "next/image"
import Link from "next/link"

import useSWR from "swr"

import * as api from "../../lib/api"
import GitHubLoginButton from "../GitHubLoginButton"

import styles from "./LoginState.module.scss"

export type Props = {
    onChange: (user: api.AnonymousUser | api.User) => void,
}

export default function LoginState({ onChange }: Props) {
    const { data: user, error } = useSWR<api.AnonymousUser | api.User>("/user", api.get)

    useEffect(() => {
        if (user) {
            onChange(user)
        }
    }, [user, onChange])

    if (error) {
        return <div>{error}</div>
    } else if (!user) {
        // Loading...
        return <div />
    } else if (user && !api.isAnonUser(user) && user.username) {
        return <Link href={`/u/${user.username}`}>
            <a title={`@${user.username}`} className={styles.user}>
                {user.avatar_url && <Image
                    className={styles.avatar}
                    src={user.avatar_url}
                    alt="User avatar"
                    width={24}
                    height={24}
                    priority
                />}
                {/*<span>{user.username}</span>*/}
            </a>
        </Link>
    } else {
        return <div className={styles.loginContainer}>
            <GitHubLoginButton label="Sign in" />
        </div>
    }
}
