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
    }>("/compilers", api.get)

    return <>
        {data?.platforms[platform]?.name ?? platform}
    </>
}
