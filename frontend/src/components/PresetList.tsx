"use client";

import { type ReactNode, type JSX, useState } from "react";

import Link from "@/components/Link";

import clsx from "clsx";

import AsyncButton from "@/components/AsyncButton";
import Button from "@/components/Button";
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
            <ul
                className={clsx(
                    "flex flex-col justify-center gap-[0.5em] overflow-hidden rounded-md border-gray-6 text-sm",
                    className,
                )}
                aria-busy={isLoading}
            >
                {results.length === 0 && isLoading ? (
                    <PresetListSkeleton />
                ) : (
                    <>
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
                    </>
                )}
            </ul>
        </>
    );
}

export function PresetItem({
    preset,
    hideIcon,
}: {
    preset: Preset;
    hideIcon?: boolean;
}): JSX.Element {
    const compilersTranslation = getTranslation("compilers");
    const compilerName = compilersTranslation.t(preset.compiler);

    return (
        <li className="rounded-md border border-gray-6 p-[1em] text-sm">
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
        </li>
    );
}

function PresetListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <>
            {Array.from({ length: count }, (_, index) => (
                <PresetItemSkeleton key={index} />
            ))}
        </>
    );
}

function PresetItemSkeleton(): JSX.Element {
    return (
        <li
            className="rounded-md border border-gray-6 p-[1em] text-sm"
            aria-hidden="true"
        >
            <div className="flex items-center gap-2">
                <span className="block size-[1.2em] shrink-0 animate-pulse rounded-full bg-[var(--g300)]" />
                <span className="block h-[1.2em] w-[min(28ch,65%)] animate-pulse rounded-full bg-[var(--g300)]" />
                <span className="ml-auto block h-[1em] w-[10ch] animate-pulse rounded-full bg-[var(--g300)]" />
            </div>
            <span className="mt-2 block h-[1em] w-[min(34ch,75%)] animate-pulse rounded-full bg-[var(--g300)]" />
        </li>
    );
}
