import Image from "next/image"
import Link from "next/link"

import classNames from "classnames"
import useSWR from "swr"

import * as api from "../lib/api"

import styles from "./ProjectIcon.module.scss"

export type Props = {
    projectUrl: string
    size?: string | number
    className?: string
}

export default function ProjectIcon({ projectUrl, size, className }: Props) {
    const { data, error } = useSWR<api.Project>(projectUrl, api.get)

    if (error)
        throw error

    if (!data) {
        return <a className={classNames(styles.icon, className)} />
    }

    const style = typeof size === "undefined" ? {} : { width: size, height: size }

    return <Link href={data.html_url}>
        <a className={classNames(styles.icon, className)} style={style}>
            <Image src={data.icon_url} alt={data.slug} layout="fill" />
        </a>
    </Link>
}
