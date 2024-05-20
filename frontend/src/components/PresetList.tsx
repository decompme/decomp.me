"use client"

import React, { ReactNode } from "react"

import Link from "next/link"

import classNames from "classnames"

import AsyncButton from "@/components/AsyncButton"
import Button from "@/components/Button"
import LoadingSpinner from "@/components/loading.svg"
import { PlatformIcon } from "@/components/PlatformSelect/PlatformIcon"
import styles from "@/components/ScratchList.module.scss"
import * as api from "@/lib/api"
import { presetUrl } from "@/lib/api/urls"
import useTranslation from "@/lib/i18n/translate"

export interface Props {
    url?: string
    className?: string
    item?: ({ preset }: { preset: api.Preset }) => React.JSX.Element
    emptyButtonLabel?: ReactNode
}

export function PresetList({ url, className, item, emptyButtonLabel }: Props): React.JSX.Element {
    const { results, isLoading, hasNext, loadNext } = api.usePaginated<api.Preset>(url || "/preset")
    if (results.length === 0 && isLoading) {
        return <div className={classNames(styles.loading, className)}>
            <LoadingSpinner width="1.5em" height="1.5em" />
            Just a moment...
        </div>
    }

    const Item = item || PresetItem

    return (
        <ul className={classNames(styles.list, "rounded-md border-gray-6 text-sm", className)}>
            {results.map(preset => (
                <Item hideIcon key={preset.id} preset={preset} />
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

export function PresetItem({ preset, hideIcon }: { preset: api.Preset, hideIcon?: boolean }): React.JSX.Element {
    const compilersTranslation = useTranslation("compilers")
    const compilerName = compilersTranslation.t(preset.compiler)

    return (
        <div className="rounded-md border border-gray-6 p-[1em] text-sm">
            <div className="flex items-center gap-2">
                {
                    hideIcon ? <></>:<PlatformIcon platform={preset.platform} className="w-[1.2em]"/>
                }
                <a className="font-semibold hover:text-[var(--link)]" href={presetUrl(preset)}>
                    {preset.name}
                </a>
            </div>
            <p className="text-gray-11">{compilerName}</p>
        </div>
    )
}
