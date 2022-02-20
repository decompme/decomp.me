import { Suspense } from "react"

import Link from "next/link"

import useSWR from "swr"

import * as api from "../lib/api"

import UserAvatar from "./user/UserAvatar"
import styles from "./UserAvatarList.module.scss"

function AsyncUserAvatar({ url }: { url: string }) {
    const { data } = useSWR<api.User>(url, api.get, {
        suspense: true,
    })

    if (!data?.avatar_url) {
        return null
    }

    return <li title={data.username}>
        <Link href={data.html_url}>
            <a>
                <UserAvatar className={styles.avatar} user={data} />
            </a>
        </Link>
    </li>
}

export default function UserAvatarList({ urls }: { urls: string[] }) {
    return <ul className={styles.list}>
        <Suspense fallback={urls.map(url => <li key={url} />)}>
            {urls.map(url => <AsyncUserAvatar key={url} url={url} />)}
        </Suspense>
    </ul>
}
