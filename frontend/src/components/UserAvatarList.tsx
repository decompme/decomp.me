import { Suspense } from "react"

import Image from "next/image"
import Link from "next/link"

import useSWR from "swr"

import * as api from "../lib/api"

import styles from "./UserAvatarList.module.scss"

function UserAvatar({ url }: { url: string }) {
    const { data } = useSWR<api.User>(url, api.get, {
        suspense: true,
    })

    const avatarUrl = data?.avatar_url

    if (!avatarUrl) {
        return null
    }

    return <li className={styles.avatar} title={data.username}>
        <Link href={data.html_url}>
            <a>
                <Image src={avatarUrl} alt={data.username} layout="fill" />
            </a>
        </Link>
    </li>
}

export default function UserAvatarList({ urls }: { urls: string[] }) {
    return <ul className={styles.list}>
        <Suspense fallback={urls.map(url => <li key={url} className={styles.skeleton} />)}>
            {urls.map(url => <UserAvatar key={url} url={url} />)}
        </Suspense>
    </ul>
}
