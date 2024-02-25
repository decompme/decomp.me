"use client"

import { ReactNode } from "react"

import Link from "next/link"

import classNames from "classnames"
import TimeAgo from "react-timeago"

import * as api from "@/lib/api"
import { presetUrl, scratchUrl } from "@/lib/api/urls"
import useTranslation from "@/lib/i18n/translate"

import AsyncButton from "./AsyncButton"
import Button from "./Button"
import LoadingSpinner from "./loading.svg"
import PlatformLink from "./PlatformLink"
import { PlatformIcon } from "./PlatformSelect/PlatformIcon"
import { calculateScorePercent, percentToString } from "./ScoreBadge"
import styles from "./ScratchList.module.scss"
import UserLink from "./user/UserLink"

export interface Props {
    url?: string
    className?: string
    item?: ({ scratch, noLink }: { scratch: api.TerseScratch, noLink?: boolean }) => JSX.Element
    emptyButtonLabel?: ReactNode
    noLink?: boolean
}

export default function ScratchList({ url, className, item, emptyButtonLabel, noLink }: Props) {
    const { results, isLoading, hasNext, loadNext } = api.usePaginated<api.TerseScratch>(url || "/scratch")

    if (results.length === 0 && isLoading) {
        return <div className={classNames(styles.loading, className)}>
            <LoadingSpinner width="1.5em" height="1.5em" />
            Just a moment...
        </div>
    }

    const Item = item || ScratchItem

    return (
        <ul className={classNames(styles.list, "rounded-md border-gray-6 text-sm", className)}>
            {results.map(scratch => (
                <Item key={scratchUrl(scratch)} scratch={scratch} noLink={noLink} />
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
        {scratches.map(scratch => <Item key={scratchUrl(scratch)} scratch={scratch} />)}
    </ul>
}

export function getMatchPercentString(scratch: api.TerseScratch) {
    if (scratch.match_override) {
        return "100%"
    }
    const matchPercent = calculateScorePercent(scratch.score, scratch.max_score)
    const matchPercentString = isNaN(matchPercent) ? "0%" : percentToString(matchPercent)

    return matchPercentString
}

export function ScratchItem({ scratch, children, noLink } : { scratch: api.TerseScratch, children?: ReactNode, noLink?: boolean }) {
    const compilersTranslation = useTranslation("compilers")
    const compilerName = compilersTranslation.t(scratch.compiler as any)
    const serverPresets = api.usePlatforms()[scratch.platform].presets
    const presetName = serverPresets.find(p => p.id === scratch.preset)?.name
    const preset = serverPresets.find(p => p.id === scratch.preset)
    const matchPercentString = getMatchPercentString(scratch)

    const presetOrCompiler = presetName ?
        <Link href={presetUrl(preset)} className={styles.link}>
            {presetName}
        </Link> : <span>{compilerName}</span>

    return (
        <li className={styles.item}>
            <div className={styles.scratch}>
                <div className={styles.header}>
                    { (noLink ? <PlatformIcon size={16} platform={scratch.platform} className={styles.icon} /> : <PlatformLink size={16} scratch={scratch} className={styles.icon} />) }
                    <Link href={scratchUrl(scratch)} className={classNames(styles.link, styles.name)}>

                        {scratch.name}

                    </Link>
                    {scratch.owner && <div className={styles.owner}>
                        <UserLink user={scratch.owner} />
                    </div>}
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
    const serverPresets = api.usePlatforms()[scratch.platform].presets
    const presetName = serverPresets.find(p => p.id === scratch.preset)?.name
    const preset = serverPresets.find(p => p.id === scratch.preset)
    const matchPercentString = getMatchPercentString(scratch)

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
                </div>
                <div className={styles.metadata}>
                    {presetOrCompiler} • {matchPercentString} matched • <TimeAgo date={scratch.last_updated} />
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
                        {matchPercentString} matched • <TimeAgo date={scratch.last_updated} />
                    </div>
                    {scratch.owner && <div className={styles.owner}>
                        <UserLink user={scratch.owner} />
                    </div>}
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
