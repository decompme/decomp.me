import { ReactNode } from "react"

import Link from "next/link"

import classNames from "classnames"
import useTranslation from "next-translate/useTranslation"
import TimeAgo from "react-timeago"

import * as api from "../lib/api"

import AsyncButton from "./AsyncButton"
import Button from "./Button"
import LoadingSpinner from "./loading.svg"
import { calculateScorePercent, percentToString } from "./ScoreBadge"
import ScratchIcon from "./ScratchIcon"
import styles from "./ScratchList.module.scss"
import UserLink from "./user/UserLink"

export interface Props {
    url?: string
    className?: string
    item?: ({ scratch }: { scratch: api.TerseScratch }) => JSX.Element
    emptyButtonLabel?: ReactNode
}

export default function ScratchList({ url, className, item, emptyButtonLabel }: Props) {
    const { results, isLoading, hasNext, loadNext } = api.usePaginated<api.TerseScratch>(url || "/scratch")

    if (results.length === 0 && isLoading) {
        return <div className={classNames(styles.loading, className)}>
            <LoadingSpinner width="1.5em" height="1.5em" />
            Just a moment...
        </div>
    }

    const Item = item || ScratchItem

    return <ul className={classNames(styles.list, className)}>
        {results.map(scratch => (
            <Item key={scratch.url} scratch={scratch} />
        ))}
        {results.length === 0 && emptyButtonLabel && <li className={styles.button}>
            <Link href="/new">
                <a>
                    <Button>
                        {emptyButtonLabel}
                    </Button>
                </a>
            </Link>
        </li>}
        {hasNext && <li className={styles.button}>
            <AsyncButton onClick={loadNext}>
                Show more
            </AsyncButton>
        </li>}
    </ul>
}

export function LoadedScratchList({ className, item, scratches }: Pick<Props, "className" | "item"> & { scratches: api.TerseScratch[] }) {
    const Item = item || ScratchItem

    return <ul className={classNames(styles.list, className)}>
        {scratches.map(scratch => <Item key={scratch.url} scratch={scratch} />)}
    </ul>

}

export function ScratchItem({ scratch }: { scratch: api.TerseScratch }) {
    const compilersTranslation = useTranslation("compilers")
    const compilerName = compilersTranslation.t(scratch.compiler)

    const matchPercent = calculateScorePercent(scratch.score, scratch.max_score)
    const matchPercentString = isNaN(matchPercent) ? "0%" : percentToString(matchPercent)

    return <li className={styles.item}>
        <div className={styles.scratch}>
            <div className={styles.header}>
                <ScratchIcon scratch={scratch} className={styles.icon} />
                <Link href={scratch.html_url}>
                    <a className={classNames(styles.link, styles.name)}>
                        {scratch.name}
                    </a>
                </Link>
                {scratch.owner && <div className={styles.owner}>
                    <UserLink user={scratch.owner} />
                </div>}
            </div>
            <div className={styles.metadata}>
                {compilerName} • {matchPercentString} matched • <TimeAgo date={scratch.last_updated} />
            </div>
        </div>
    </li>
}

export function ScratchItemNoOwner({ scratch }: { scratch: api.TerseScratch }) {
    const compilersTranslation = useTranslation("compilers")
    const compilerName = compilersTranslation.t(scratch.compiler)

    const matchPercent = calculateScorePercent(scratch.score, scratch.max_score)
    const matchPercentString = isNaN(matchPercent) ? "0%" : percentToString(matchPercent)

    return <li className={styles.item}>
        <div className={styles.scratch}>
            <div className={styles.header}>
                <ScratchIcon scratch={scratch} className={styles.icon} />
                <Link href={scratch.html_url}>
                    <a className={classNames(styles.link, styles.name)}>
                        {scratch.name}
                    </a>
                </Link>
            </div>
            <div className={styles.metadata}>
                {compilerName} • {matchPercentString} matched • <TimeAgo date={scratch.last_updated} />
            </div>
        </div>
    </li>
}

export function SingleLineScratchItem({ scratch }: { scratch: api.TerseScratch }) {
    const matchPercent = calculateScorePercent(scratch.score, scratch.max_score)
    const matchPercentString = isNaN(matchPercent) ? "0%" : percentToString(matchPercent)

    return <li className={styles.singleLine}>
        <ScratchIcon scratch={scratch} className={styles.icon} />
        <Link href={scratch.html_url}>
            <a className={classNames(styles.link, styles.name)}>
                {scratch.name}
            </a>
        </Link>
        <div className={styles.metadata}>
            {matchPercentString}
        </div>
    </li>
}
