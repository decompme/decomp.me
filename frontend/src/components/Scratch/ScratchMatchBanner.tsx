import Link from "next/link"

import useSWR from "swr"

import * as api from "@/lib/api"
import { scratchUrl } from "@/lib/api/urls"

import DismissableBanner from "../DismissableBanner"

export default function ScratchMatchBanner({ scratch }: { scratch: api.TerseScratch }) {
    const userIsYou = api.useUserIsYou()
    const { data, error } = useSWR<api.TerseScratch[]>(`${scratchUrl(scratch)}/family`, api.get, {
        refreshInterval: 60 * 1000, // 1 minute
    })

    // Consciously not including match_override here, since it's not really banner-worthy
    const match = data?.find(s => s.score === 0 && s.slug !== scratch.slug)

    if (error)
        throw error

    if (scratch.score === 0 || !match)
        return null

    let message = "This function has been matched"
    if (userIsYou(match.owner))
        message += " by you, elsewhere"
    else if (match.owner)
        message += ` by ${match.owner.username}`

    return <DismissableBanner>
        {message}. <Link href={scratchUrl(match)}>View match</Link>
    </DismissableBanner>
}
