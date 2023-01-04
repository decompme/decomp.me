import { joinTitles } from "@/lib/title"

export type Props = {
    title?: string
    description?: string
}

export default function PageTitle({ title, description }: Props) {
    const titleWithSiteName = joinTitles(title)

    return <>
        <title>{titleWithSiteName}</title>
        <meta name="description" content={description || ""} />

        <meta property="og:site_name" content="decomp.me" />
        <meta property="og:title" content={title || ""} />
        <meta property="og:description" content={description || ""} />

        <meta name="darkreader-lock" />
    </>
}
