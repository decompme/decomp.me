import Link from "next/link";

import useSWR from "swr";

import * as api from "@/lib/api";
import { scratchUrl } from "@/lib/api/urls";

import DismissableBanner from "../DismissableBanner";
import { calculateScorePercent, percentToString } from "../ScoreBadge";

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
        ?.filter(
            (s) =>
                s.slug !== scratch.slug &&
                s.score < scratch.score &&
                s.score > -1,
        )
        .reduce((lowest, current) => {
            return !lowest || current.score < lowest.score ? current : lowest;
        }, null);

    if (error) throw error;

    if (scratch.score === 0 || !match) return null;

    const isMatch = match.score === 0;

    const percent = calculateScorePercent(match.score, match.max_score);
    const percentString = percent !== 0 ? percentToString(percent) : "";

    let message = `This function has ${isMatch ? "been matched" : "a lower-scoring scratch"}`;
    if (userIsYou(match.owner)) message += " by you, elsewhere";
    else if (match.owner) message += ` by ${match.owner.username}`;

    if (!isMatch)
        message += `. Improved score is ${match.score.toLocaleString("en-US")} ${percentString && `(${percentString})`}`;

    return (
        <DismissableBanner color={isMatch ? "#951fd9" : "#4273e1"}>
            {message}.{" "}
            <Link href={scratchUrl(match)}>
                View {match.score === 0 ? "match" : "improvement"}
            </Link>
        </DismissableBanner>
    );
}
