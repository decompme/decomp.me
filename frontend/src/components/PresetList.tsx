"use client"

import type { ReactNode, JSX } from "react"

import Link from "next/link"

import classNames from "classnames"

import AsyncButton from "@/components/AsyncButton"
import Button from "@/components/Button"
import LoadingSpinner from "@/components/loading.svg"
import { PlatformIcon } from "@/components/PlatformSelect/PlatformIcon"
import { type Preset, usePaginated } from "@/lib/api"
import { presetUrl } from "@/lib/api/urls"
import useTranslation from "@/lib/i18n/translate"

export interface Props {
    url?: string
    className?: string
    item?: ({ preset }: { preset: Preset }) => JSX.Element
    emptyButtonLabel?: ReactNode
}

export function PresetList({ url, className, item, emptyButtonLabel }: Props): JSX.Element {
    const { results, isLoading, hasNext, loadNext } = usePaginated<Preset>(url || "/preset")
    if (results.length === 0 && isLoading) {
        return <div className={classNames("flex justify-center items-center gap-[0.5em] p-[1em] opacity-50", className)}>
            <LoadingSpinner width="1.5em" height="1.5em" />
            Just a moment...
        </div>
    }

    const Item = item ?? PresetItem

    return (
        <ul className={classNames("flex flex-col justify-center gap-[0.5em] overflow-hidden p-[1em] border-[1px] border-[solid] rounded-md border-gray-6 text-sm", className)}>
            {results.map(preset => (
                <Item hideIcon key={preset.id} preset={preset} />
            ))}
            {results.length === 0 && emptyButtonLabel && <li className={"col-[span_var(--num-columns,_1)] mt-[0.5em] flex items-center justify-center opacity-70"}>
                <Link href="/new">

                    <Button>
                        {emptyButtonLabel}
                    </Button>

                </Link>
            </li>}
            {hasNext && <li className={"col-[span_var(--num-columns,_1)] mt-[0.5em] flex items-center justify-center opacity-70"}>
                <AsyncButton onClick={loadNext}>
                    Show more
                </AsyncButton>
            </li>}
        </ul>
    )
}

export function PresetItem({ preset, hideIcon }: { preset: Preset, hideIcon?: boolean }): JSX.Element {
    const compilersTranslation = useTranslation("compilers")
    const compilerName = compilersTranslation.t(preset.compiler)

    return (
        <div className="rounded-md border border-gray-6 p-[1em] text-sm">
            <div className="flex items-center gap-2">
                {hideIcon && <PlatformIcon platform={preset.platform} className="w-[1.2em]"/>}
                <a className="font-semibold hover:text-[var(--link)]" href={presetUrl(preset)}>
                    {preset.name}
                </a>
            </div>
            <p className="text-gray-11">{compilerName}</p>
        </div>
    )
}
