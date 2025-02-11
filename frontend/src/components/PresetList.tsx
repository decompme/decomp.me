"use client";

import { type ReactNode, type JSX, useState } from "react";

import Link from "next/link";

import classNames from "classnames";

import AsyncButton from "@/components/AsyncButton";
import Button from "@/components/Button";
import LoadingSpinner from "@/components/loading.svg";
import { PlatformIcon } from "@/components/PlatformSelect/PlatformIcon";
import { type Preset, usePaginated } from "@/lib/api";
import { presetUrl } from "@/lib/api/urls";
import getTranslation from "@/lib/i18n/translate";
import Sort, { SortMode } from "./SortPreset";

export interface Props {
    title?: string;
    url?: string;
    className?: string;
    item?: ({ preset }: { preset: Preset }) => JSX.Element;
    emptyButtonLabel?: ReactNode;
}

export function PresetList({
    title,
    url,
    className,
    item,
    emptyButtonLabel,
}: Props): JSX.Element {
    const [sortMode, setSortMode] = useState(SortMode.ALPHABETICAL_AZ);
    const { results, isLoading, hasNext, loadNext } = usePaginated<Preset>(
        `${url || "/preset"}&ordering=${sortMode.toString()}`,
    );

    const Item = item ?? PresetItem;

    return (
        <>
            <div className="flex justify-between pb-2">
                <h2 className="font-medium text-lg tracking-tight">{title}</h2>
                <Sort sortMode={sortMode} setSortMode={setSortMode} />
            </div>
            {results.length === 0 && isLoading ? (
                <div
                    className={classNames(
                        "flex items-center justify-center gap-[0.5em] p-[1em] opacity-50",
                        className,
                    )}
                >
                    <LoadingSpinner width="1.5em" height="1.5em" />
                    Just a moment...
                </div>
            ) : (
                <ul
                    className={classNames(
                        "flex flex-col justify-center gap-[0.5em] overflow-hidden rounded-md border-gray-6 text-sm",
                        className,
                    )}
                >
                    {results.map((preset) => (
                        <Item hideIcon key={preset.id} preset={preset} />
                    ))}
                    {results.length === 0 && emptyButtonLabel && (
                        <li
                            className={
                                "col-[span_var(--num-columns,_1)] mt-[0.5em] flex items-center justify-center opacity-70"
                            }
                        >
                            <Link href="/new">
                                <Button>{emptyButtonLabel}</Button>
                            </Link>
                        </li>
                    )}
                    {hasNext && (
                        <li
                            className={
                                "col-[span_var(--num-columns,_1)] mt-[0.5em] flex items-center justify-center opacity-70"
                            }
                        >
                            <AsyncButton onClick={loadNext}>
                                Show more
                            </AsyncButton>
                        </li>
                    )}
                </ul>
            )}
        </>
    );
}

export function PresetItem({
    preset,
    hideIcon,
}: { preset: Preset; hideIcon?: boolean }): JSX.Element {
    const compilersTranslation = getTranslation("compilers");
    const compilerName = compilersTranslation.t(preset.compiler);

    return (
        <div className="rounded-md border border-gray-6 p-[1em] text-sm">
            <div className="flex">
                <div className="flex gap-2">
                    {hideIcon && (
                        <PlatformIcon
                            platform={preset.platform}
                            className="w-[1.2em]"
                        />
                    )}
                    <a
                        className="grow font-semibold hover:text-[var(--link)]"
                        href={presetUrl(preset)}
                    >
                        {preset.name}
                    </a>
                </div>
                <div className="flex-1 text-right text-gray-11">
                    {preset.num_scratches > 1
                        ? `${preset.num_scratches.toLocaleString("en-US")} scratches`
                        : preset.num_scratches > 0
                          ? `${preset.num_scratches} scratch`
                          : "No scratches"}
                </div>
            </div>
            <p className="text-gray-11">{compilerName}</p>
        </div>
    );
}
