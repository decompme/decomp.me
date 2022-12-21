"use client"

import { ReactNode } from "react"

import Link from "next/link"

import classNames from "classnames"
import TimeAgo from "react-timeago"

import * as api from "@/lib/api"
import useTranslation from "@/lib/i18n/translate"

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

    return (
        <ul className={classNames(styles.list, "rounded-md border-gray-3 dark:border-gray-8 text-sm", className)}>
            {results.map(scratch => (
                <Item key={scratch.url} scratch={scratch} />
            ))}
            {results.length === 0 && emptyButtonLabel && <li className={styles.button}>
                <Link href="/new">

                    <Button>
                        {emptyButtonLabel}
                    </Button>

                </Link>
            </li>}
            {hasNext && <li className={styles.button}>
                <AsyncButton onClick={loadNext}>
                    Show more
                </AsyncButton>
            </li>}
        </ul>
    )
}

export function LoadedScratchList({ className, item, scratches }: Pick<Props, "className" | "item"> & { scratches: api.TerseScratch[] }) {
    const Item = item || ScratchItem

    return <ul className={classNames(styles.list, className)}>
        {scratches.map(scratch => <Item key={scratch.url} scratch={scratch} />)}
    </ul>
}

export function ScratchItem({ scratch, children }: { scratch: api.TerseScratch, children?: ReactNode }) {
    const compilersTranslation = useTranslation("compilers")
    const compilerName = compilersTranslation.t(scratch.compiler as any)

    const matchPercent = calculateScorePercent(scratch.score, scratch.max_score)
    const matchPercentString = isNaN(matchPercent) ? "0%" : percentToString(matchPercent)

    return (
        <li className={styles.item}>
            <div className={styles.scratch}>
                <div className={styles.header}>
                    <ScratchIcon size={16} scratch={scratch} className={styles.icon} />
                    <Link href={scratch.html_url} className={classNames(styles.link, styles.name)}>

                        {scratch.name}

                    </Link>
                    {scratch.owner && <div className={styles.owner}>
                        <UserLink user={scratch.owner} />
                    </div>}
                </div>
                <div className={styles.metadata}>
                    <span>
                        {compilerName} • {matchPercentString} matched • <TimeAgo date={scratch.last_updated} />
                    </span>
                    <div className={styles.actions}>
                        {children}
                    </div>
                </div>
            </div>
        </li>
    )
}

export function ScratchItemNoOwner({ scratch }: { scratch: api.TerseScratch }) {
    const compilersTranslation = useTranslation("compilers")
    const compilerName = compilersTranslation.t(scratch.compiler)

    const matchPercent = calculateScorePercent(scratch.score, scratch.max_score)
    const matchPercentString = isNaN(matchPercent) ? "0%" : percentToString(matchPercent)

    return (
        <li className={styles.item}>
            <div className={styles.scratch}>
                <div className={styles.header}>
                    <ScratchIcon size={16} scratch={scratch} className={styles.icon} />
                    <Link href={scratch.html_url} className={classNames(styles.link, styles.name)}>

                        {scratch.name}

                    </Link>
                </div>
                <div className={styles.metadata}>
                    {compilerName} • {matchPercentString} matched • <TimeAgo date={scratch.last_updated} />
                </div>
            </div>
        </li>
    )
}

export function SingleLineScratchItem({ scratch }: { scratch: api.TerseScratch }) {
    const matchPercent = calculateScorePercent(scratch.score, scratch.max_score)
    const matchPercentString = isNaN(matchPercent) ? "0%" : percentToString(matchPercent)

    return (
        <li className={styles.singleLine}>
            <ScratchIcon size={16} scratch={scratch} className={styles.icon} />
            <Link href={scratch.html_url} className={classNames(styles.link, styles.name)}>

                {scratch.name}

            </Link>
            <div className={styles.metadata}>
                {matchPercentString}
            </div>
        </li>
    )
}
