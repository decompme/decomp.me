import Link from "next/link"

import classNames from "classnames"
import TimeAgo from "react-timeago"

import * as api from "../lib/api"

import AsyncButton from "./AsyncButton"
import COMPILERS from "./compiler/compilers"
import LoadingSpinner from "./loading.svg"
import PlatformIcon from "./PlatformSelect/PlatformIcon"
import { calculateScorePercent, percentToString } from "./ScoreBadge"
import styles from "./ScratchList.module.scss"
import UserLink from "./user/UserLink"

function Scratch({ scratch }: { scratch: api.TerseScratch }) {
    const compilerName = COMPILERS.find(c => c.id == scratch.compiler)?.name ?? scratch.compiler

    const matchPercent = calculateScorePercent(scratch.score, scratch.max_score)
    const matchPercentString = isNaN(matchPercent) ? "0%" : percentToString(matchPercent)

    return <div className={styles.scratch}>
        <div className={styles.header}>
            <PlatformIcon platform={scratch.platform} className={styles.icon} />
            <Link href={scratch.html_url}>
                <a className={classNames(styles.link, styles.name)}>
                    {scratch.name}
                </a>
            </Link>
            {scratch.owner && <UserLink user={scratch.owner} />}
        </div>
        <div className={styles.metadata}>
            {compilerName} • {matchPercentString} matched • <TimeAgo date={scratch.last_updated} />
        </div>
    </div>
}

export interface Props {
    url?: string
    className?: string
}

export default function ScratchList({ url, className }: Props) {
    const { results, isLoading, hasNext, loadNext } = api.usePaginated<api.TerseScratch>(url || "/scratch")

    if (results.length === 0 && isLoading) {
        return <div className={classNames(styles.loading, className)}>
            <LoadingSpinner width="1.5em" height="1.5em" />
            Just a moment...
        </div>
    }

    return <ul className={classNames(styles.list, className)}>
        {results.map(scratch => (
            <li key={scratch.url} className={styles.item}>
                <Scratch scratch={scratch} />
            </li>
        ))}
        {hasNext && <li className={styles.loadButton}>
            <AsyncButton onClick={loadNext}>
                Show more
            </AsyncButton>
        </li>}
    </ul>
}
