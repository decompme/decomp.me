"use client";

import { type JSX, type ReactNode, useState } from "react";

import Link from "next/link";

import clsx from "clsx";

import AsyncButton from "./AsyncButton";
import Button from "./Button";
import styles from "./ScratchList.module.scss";
import { type TerseScratch, usePaginated } from "@/lib/api";
import { scratchUrl } from "@/lib/api/urls";
import { ScratchItem } from "./ScratchItem";
import Sort, { SortMode } from "./SortScratch";
import { TextSkeleton, SCRATCH_LIST } from "./TextSkeleton";

export interface Props {
    title?: string;
    url?: string;
    className?: string;
    item?: ({ scratch }: { scratch: TerseScratch }) => JSX.Element;
    emptyButtonLabel?: ReactNode;
    isSortable?: boolean;
}

export default function ScratchList({
    title,
    url,
    className,
    item,
    emptyButtonLabel,
    isSortable,
}: Props) {
    const [sortMode, setSortMode] = useState(SortMode.NEWEST_FIRST);
    const { results, isLoading, hasNext, loadNext } =
        usePaginated<TerseScratch>(
            `${url || "/scratch"}&ordering=${sortMode.toString()}`,
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
            {results.length === 0 && isLoading ? (
                <TextSkeleton text={SCRATCH_LIST} />
            ) : (
                <ul
                    className={clsx(
                        styles.list,
                        "rounded-md border-gray-6 text-sm",
                        className,
                    )}
                >
                    {results.map((scratch) => (
                        <Item key={scratchUrl(scratch)} scratch={scratch} />
                    ))}
                    {results.length === 0 && emptyButtonLabel && (
                        <li className={styles.button}>
                            <Link href="/new" prefetch={false}>
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
                </ul>
            )}
        </>
    );
}
