"use client";

import { type JSX, type ReactNode, useState } from "react";

import Link from "@/components/Link";

import clsx from "clsx";

import AsyncButton from "./AsyncButton";
import Button from "./Button";
import styles from "./ScratchList.module.scss";
import { type TerseScratch, usePaginated } from "@/lib/api";
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
}: Props) {
    const [sortMode, setSortMode] = useState(SortMode.NEWEST_FIRST);
    const { results, isLoading, hasNext, loadNext } =
        usePaginated<TerseScratch>(
            `${url || "/scratch"}&ordering=${sortMode.toString()}`,
            { isPublic },
        );

    const Item = item || ScratchItem;

    return (
        <>
            <div className="flex justify-between pb-2">
                <h2 className="font-medium text-lg tracking-tight">{title}</h2>
                {isSortable && (
                    <Sort sortMode={sortMode} setSortMode={setSortMode} />
                )}
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
