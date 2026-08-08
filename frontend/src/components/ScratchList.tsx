"use client";

import { type JSX, type ReactNode, useState } from "react";

import Link from "@/components/Link";

import clsx from "clsx";

import AsyncButton from "./AsyncButton";
import Button from "./Button";
import styles from "./ScratchList.module.scss";
import ScratchFilters from "./ScratchFilters";
import {
    buildScratchListUrl,
    selectScratchPlatform,
    selectScratchPreset,
    type ScratchFilterState,
} from "./ScratchList.state";
import { type PlatformBase, type TerseScratch, usePaginated } from "@/lib/api";
import { scratchUrl } from "@/lib/api/urls";
import {
    ScratchItem,
    ScratchItemSkeleton,
    type ScratchItemSkeletonVariant,
} from "./ScratchItem";
import Sort, { SortMode } from "./SortScratch";

export interface Props {
    title?: string;
    url?: string;
    className?: string;
    item?: ({
        scratch,
        showDeleteButton,
    }: {
        scratch: TerseScratch;
        showDeleteButton?: boolean;
    }) => JSX.Element;
    emptyButtonLabel?: ReactNode;
    isSortable?: boolean;
    isPublic?: boolean;
    showDeleteButtons?: boolean;
    skeletonVariant?: ScratchItemSkeletonVariant;
    availablePlatforms?: Record<string, PlatformBase>;
    fixedPlatform?: string;
}

function ScratchListSkeleton({
    count = 10,
    variant = "row",
}: {
    count?: number;
    variant?: ScratchItemSkeletonVariant;
}) {
    return (
        <>
            {Array.from({ length: count }, (_, index) => (
                <ScratchItemSkeleton key={index} variant={variant} />
            ))}
        </>
    );
}

export default function ScratchList({
    title,
    url,
    className,
    item,
    emptyButtonLabel,
    isSortable,
    isPublic,
    showDeleteButtons,
    skeletonVariant,
    availablePlatforms,
    fixedPlatform,
}: Props) {
    const [sortMode, setSortMode] = useState(SortMode.NEWEST_FIRST);
    const [filters, setFilters] = useState<ScratchFilterState>({});
    const activeFilters = fixedPlatform
        ? { ...filters, platform: fixedPlatform }
        : filters;
    const isFilterable = availablePlatforms !== undefined || !!fixedPlatform;
    const { results, isLoading, hasNext, loadNext } =
        usePaginated<TerseScratch>(
            buildScratchListUrl(
                url || "/scratch",
                sortMode.toString(),
                activeFilters,
            ),
            { isPublic },
        );

    const Item = item || ScratchItem;

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                <h2 className="font-medium text-lg tracking-tight">{title}</h2>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    {isFilterable && (
                        <ScratchFilters
                            availablePlatforms={availablePlatforms}
                            filters={activeFilters}
                            onPlatformChange={(platform) => {
                                setFilters(selectScratchPlatform(platform));
                            }}
                            onPresetChange={(preset) => {
                                setFilters((current) =>
                                    selectScratchPreset(current, preset),
                                );
                            }}
                        />
                    )}
                    {isSortable && (
                        <Sort sortMode={sortMode} setSortMode={setSortMode} />
                    )}
                </div>
            </div>
            <ul
                className={clsx(
                    styles.list,
                    "rounded-md border-gray-6 text-sm",
                    className,
                )}
                aria-busy={isLoading}
            >
                {results.length === 0 && isLoading ? (
                    <ScratchListSkeleton variant={skeletonVariant} />
                ) : (
                    <>
                        {results.map((scratch) => (
                            <Item
                                key={scratchUrl(scratch)}
                                scratch={scratch}
                                showDeleteButton={showDeleteButtons}
                            />
                        ))}
                        {results.length === 0 && emptyButtonLabel && (
                            <li className={styles.button}>
                                <Link href="/new">
                                    <Button>{emptyButtonLabel}</Button>
                                </Link>
                            </li>
                        )}
                        {hasNext && (
                            <li className={styles.button}>
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
