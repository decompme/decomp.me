import { h } from "preact"
import { useEffect } from "preact/hooks"
import useSWR from "swr"

import * as api from "../api"
import GitHubLoginButton from "./GitHubLoginButton"
import UserLink from "./UserLink"

export type Props = {
    onChange?: (user: api.AnonymousUser) => void,
}

export default function LoginState({ onChange }: Props) {
    const { data, error } = useSWR("/user", api.get)

    useEffect(() => {
        if (onChange && data?.user) {
            onChange(data.user)
        }
    }, [data, onChange])

    if (error) {
        return <div>{error}</div>
    } else if (!data?.user) {
        // Loading...
        return <div />
    } else if (data?.user?.username) {
        return <UserLink username={data.user.username} />
    } else {
        return <GitHubLoginButton />
    }
}
