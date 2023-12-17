import Link from "next/link"

import useSWRImmutable from "swr/immutable"

import * as api from "@/lib/api"

export type Props = {
    platform: string
}

export default function PlatformName({ platform }: Props) {
    const { data } = useSWRImmutable<{
        platforms: {
            [key: string]: {
                name: string
                description: string
            }
        }
    }>("/compiler", api.get)

    return <>
        <Link href={"/platform/" + platform}>
            {data?.platforms[platform]?.name ?? platform}
        </Link>
    </>
}
