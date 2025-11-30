import Link from "next/link";

import useSWR from "swr";

import * as api from "@/lib/api";
import { scratchUrl } from "@/lib/api/urls";

import DismissableBanner from "../DismissableBanner";

export default function ScratchMatchBanner({
    scratch,
}: { scratch: api.TerseScratch }) {
    const userIsYou = api.useUserIsYou();
    const { data, error } = useSWR<api.TerseScratch[]>(
        `${scratchUrl(scratch)}/family`,
        api.get,
        {
            refreshInterval: 60 * 1000, // 1 minute
        },
    );

    const match = data
        ?.filter((s) => s.slug !== scratch.slug && s.score < scratch.score && s.score > -1)
        .reduce((lowest, current) => {
            return !lowest || current.score < lowest.score ? current : lowest;
        }, null);

    if (error) throw error;

    if (scratch.score === 0 || !match) return null;

    let message = `This function has been ${match.score === 0 ? "matched" : `improved (score: ${match.score.toLocaleString("en-US")})`}`;
    if (userIsYou(match.owner)) message += " by you, elsewhere";
    else if (match.owner) message += ` by ${match.owner.username}`;

    return (
        <DismissableBanner>
            {message}.{" "}
            <Link href={scratchUrl(match)}>
                View {match.score === 0 ? "match" : "improvement"}
            </Link>
        </DismissableBanner>
    );
}
