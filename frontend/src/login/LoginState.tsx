import { h, Fragment } from "preact"
import { useState, useEffect } from "preact/hooks"
import useSWR from "swr"

import * as api from "../api"
import User from "./User"
import GitHubLoginButton from "./GitHubLoginButton"

import styles from "./LoginState.module.css"

export type Props = {
    onChange: (user: User | null) => any,
}

export default function LoginState({ onChange }: Props) {
    const { data, error } = useSWR("/user", api.get)

    useEffect(() => {
        if (onChange) {
            if (data.user?.username) {
                onChange(data.user)
            } else {
                onChange(null)
            }
        }
    }, [data])

    if (error) {
        return <div>{error}</div>
    } else if (!data) {
        // Loading...
        return <div></div>
    } else if (data.user?.username) {
        return <div class={styles.user}>
            <img class={styles.avatar} src={data.user.avatar_url} alt="User avatar" />
            <span>
                {data.user.name}
                {import.meta.env.DEBUG && ` (${data.user.id})`}
            </span>
        </div>
    } else {
        return <GitHubLoginButton />
    }
}
