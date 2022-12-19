"use client"

import { useEffect } from "react"

import Head from "next/head" // TODO: use head.tsx instead

export type Props = {
    title?: string
    description?: string
}

export default function PageTitle({ title, description }: Props) {
    const titleWithSiteName = title ? `${title} - decomp.me` : "decomp.me"

    useEffect(() => {
        document.title = titleWithSiteName
    }, [titleWithSiteName])

    return <Head>
        <title>{titleWithSiteName}</title>
        <meta name="description" content={description || ""} />

        <meta property="og:site_name" content="decomp.me" />
        <meta property="og:title" content={title || ""} />
        <meta property="og:description" content={description || ""} />
    </Head>
}
