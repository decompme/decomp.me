"use client"

import { ReactNode, useState } from "react"

import Link from "next/link"

import classNames from "classnames"

import TimeAgo from "@/components/TimeAgo"
import * as api from "@/lib/api"
import { presetUrl, scratchUrl } from "@/lib/api/urls"
import useTranslation from "@/lib/i18n/translate"

import AsyncButton from "./AsyncButton"
import Button from "./Button"
import LoadingSpinner from "./loading.svg"
import PlatformLink from "./PlatformLink"
import { calculateScorePercent, percentToString } from "./ScoreBadge"
import styles from "./ScratchList.module.scss"
import Sort, { SortMode } from "./Sort"
import UserLink from "./user/UserLink"

export interface Props {
    title?: string
    url?: string
    className?: string
    item?: ({ scratch }: { scratch: api.TerseScratch }) => JSX.Element
    emptyButtonLabel?: ReactNode
    isSortable?: boolean
}

export default function ScratchList({ title, url, className, item, emptyButtonLabel, isSortable }: Props) {
    const [sortMode, setSortBy] = useState(SortMode.NEWEST_FIRST)
    const { results, isLoading, hasNext, loadNext } = api.usePaginated<api.TerseScratch>(`${url || "/scratch"}&ordering=${sortMode.toString()}`)

    if (results.length === 0 && isLoading) {
        return <div className={classNames(styles.loading, className)}>
            <LoadingSpinner width="1.5em" height="1.5em" />
            Just a moment...
        </div>
    }

    const Item = item || ScratchItem

    return (
        <>
            <div className="flex justify-between pb-2">
                <h2 className="text-lg font-medium tracking-tight">{title}</h2>
                {isSortable && <Sort sortMode={sortMode} setSortMode={setSortBy} />}
            </div>
            <ul className={classNames(styles.list, "rounded-md border-gray-6 text-sm", className)}>
                {results.map(scratch => (
                    <Item key={scratchUrl(scratch)} scratch={scratch} />
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
        </>
    )
}

export function getMatchPercentString(scratch: api.TerseScratch) {
    if (scratch.match_override) {
        return "100%"
    }
    const matchPercent = calculateScorePercent(scratch.score, scratch.max_score)
    const matchPercentString = isNaN(matchPercent) ? "0%" : percentToString(matchPercent)

    return matchPercentString
}

export function ScratchItem({ scratch, children }: { scratch: api.TerseScratch, children?: ReactNode }) {
    const compilersTranslation = useTranslation("compilers")
    const compilerName = compilersTranslation.t(scratch.compiler as any)
    const matchPercentString = getMatchPercentString(scratch)
    const preset = api.usePreset(scratch.preset)
    const presetName = preset?.name

    const presetOrCompiler = presetName ?
        <Link href={presetUrl(preset)} className={styles.link}>
            {presetName}
        </Link> : <span>{compilerName}</span>

    return (
        <li className={styles.item}>
            <div className={styles.scratch}>
                <div className={styles.header}>
                    <PlatformLink size={16} scratch={scratch} className={styles.icon} />
                    <Link href={scratchUrl(scratch)} className={classNames(styles.link, styles.name)}>
                        {scratch.name}
                    </Link>
                    <div className={styles.owner}>
                        {scratch.owner ?
                            <UserLink user={scratch.owner} />
                            :
                            <div>No Owner</div>
                        }
                    </div>
                </div>
                <div className={styles.metadata}>
                    <span>
                        {presetOrCompiler} • {matchPercentString} matched • <TimeAgo date={scratch.last_updated} />
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
    const matchPercentString = getMatchPercentString(scratch)
    const preset = api.usePreset(scratch.preset)
    const presetName = preset?.name

    const presetOrCompiler = presetName ?
        <Link href={presetUrl(preset)} className={styles.link}>
            {presetName}
        </Link> : <span>{compilerName}</span>

    return (
        <li className={styles.item}>
            <div className={styles.scratch}>
                <div className={styles.header}>
                    <PlatformLink size={16} scratch={scratch} className={styles.icon} />
                    <Link href={scratchUrl(scratch)} className={classNames(styles.link, styles.name)}>
                        {scratch.name}
                    </Link>
                    <div>
                        {/* empty div for alignment */}
                    </div>
                </div>
                <div className={styles.metadata}>
                    <span>
                        {presetOrCompiler} • {matchPercentString} matched • <TimeAgo date={scratch.last_updated} />
                    </span>
                </div>
            </div>
        </li>
    )
}

export function ScratchItemPlatformList({ scratch }: { scratch: api.TerseScratch }) {
    const compilersTranslation = useTranslation("compilers")
    const compilerName = compilersTranslation.t(scratch.compiler)
    const matchPercentString = getMatchPercentString(scratch)
    const preset = api.usePreset(scratch.preset)
    const presetName = preset?.name

    const presetOrCompiler = presetName ?
        <Link href={presetUrl(preset)} className={styles.link}>
            {presetName}
        </Link> : <span>{compilerName}</span>

    return (
        <li className={styles.item}>
            <div className={styles.scratch}>
                <div className={styles.header}>
                    <Link href={scratchUrl(scratch)} className={classNames(styles.link, styles.name)}>
                        {scratch.name}
                    </Link>
                    <div className={styles.owner}>
                        {scratch.owner ?
                            <UserLink user={scratch.owner} />
                            :
                            <div>No Owner</div>
                        }
                    </div>

                </div>
                <div className={styles.metadata}>
                    <span>
                        {presetOrCompiler} • {matchPercentString} matched • <TimeAgo date={scratch.last_updated} />
                    </span>
                </div>
            </div>
        </li>
    )
}

export function ScratchItemPresetList({ scratch }: { scratch: api.TerseScratch }) {
    const matchPercentString = getMatchPercentString(scratch)

    return (
        <li className={styles.item}>
            <div className={styles.scratch}>
                <div className={styles.header}>
                    <Link href={scratchUrl(scratch)} className={classNames(styles.link, styles.name)}>
                        {scratch.name}
                    </Link>
                    <div className={styles.metadata}>
                        <span>
                            {matchPercentString} matched • <TimeAgo date={scratch.last_updated} />
                        </span>
                    </div>
                    <div className={styles.owner}>
                        {scratch.owner ?
                            <UserLink user={scratch.owner} />
                            :
                            <div>No Owner</div>
                        }
                    </div>
                </div>

            </div>
        </li>
    )
}

export function SingleLineScratchItem({ scratch }: { scratch: api.TerseScratch }) {
    const matchPercentString = getMatchPercentString(scratch)

    return (
        <li className={styles.singleLine}>
            <PlatformLink size={16} scratch={scratch} className={styles.icon} />
            <Link href={scratchUrl(scratch)} className={classNames(styles.link, styles.name)}>
                {scratch.name}
            </Link>
            <div className={styles.metadata}>
                {matchPercentString}
            </div>
        </li>
    )
}
