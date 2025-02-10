"use client";

import { type ReactNode, useState } from "react";

import Image from "next/image";
import Link from "next/link";

import classNames from "classnames";

import TimeAgo from "@/components/TimeAgo";
import * as api from "@/lib/api";
import { presetUrl, scratchUrl, userAvatarUrl } from "@/lib/api/urls";

import getTranslation from "@/lib/i18n/translate";

import AnonymousFrogAvatar from "./user/AnonymousFrog";
import AsyncButton from "./AsyncButton";
import Button from "./Button";
import PlatformLink from "./PlatformLink";
import { calculateScorePercent, percentToString } from "./ScoreBadge";
import styles from "./ScratchList.module.scss";
import Sort, { SortMode } from "./SortScratch";
import UserLink from "./user/UserLink";

import { TextSkeleton, SCRATCH_LIST } from "./TextSkeleton";

export interface Props {
    title?: string;
    url?: string;
    className?: string;
    item?: ({ scratch }: { scratch: api.TerseScratch }) => JSX.Element;
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
        api.usePaginated<api.TerseScratch>(
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
                    className={classNames(
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
                </ul>
            )}
        </>
    );
}

export function getMatchPercentString(scratch: api.TerseScratch) {
    if (scratch.score === -1) {
        return "0%";
    }
    if (scratch.match_override) {
        return "100%";
    }
    const matchPercent = calculateScorePercent(
        scratch.score,
        scratch.max_score,
    );
    const matchPercentString = percentToString(matchPercent);

    return matchPercentString;
}

export function ScratchItem({
    scratch,
    children,
}: { scratch: api.TerseScratch; children?: ReactNode }) {
    const compilersTranslation = getTranslation("compilers");
    const compilerName = compilersTranslation.t(scratch.compiler);
    const matchPercentString = getMatchPercentString(scratch);
    const preset = api.usePreset(scratch.preset);
    const presetName = preset?.name;

    const presetOrCompiler = presetName ? (
        <Link href={presetUrl(preset)} className={styles.link}>
            {presetName}
        </Link>
    ) : (
        <span>{compilerName}</span>
    );

    return (
        <li className={styles.item}>
            <div className={styles.scratch}>
                <div className={styles.header}>
                    <PlatformLink
                        size={16}
                        scratch={scratch}
                        className={styles.icon}
                    />
                    <Link
                        href={scratchUrl(scratch)}
                        className={classNames(styles.link, styles.name)}
                    >
                        {scratch.name}
                    </Link>
                    <div className={styles.owner}>
                        {scratch.owner ? (
                            <UserLink user={scratch.owner} />
                        ) : (
                            <div>No Owner</div>
                        )}
                    </div>
                </div>
                <div className={styles.metadata}>
                    <span>
                        {presetOrCompiler} • {matchPercentString} matched •{" "}
                        <TimeAgo date={scratch.last_updated} />
                    </span>
                    <div className={styles.actions}>{children}</div>
                </div>
            </div>
        </li>
    );
}

export function ScratchItemNoOwner({ scratch }: { scratch: api.TerseScratch }) {
    const compilersTranslation = getTranslation("compilers");
    const compilerName = compilersTranslation.t(scratch.compiler);
    const matchPercentString = getMatchPercentString(scratch);
    const preset = api.usePreset(scratch.preset);
    const presetName = preset?.name;

    const presetOrCompiler = presetName ? (
        <Link href={presetUrl(preset)} className={styles.link}>
            {presetName}
        </Link>
    ) : (
        <span>{compilerName}</span>
    );

    return (
        <li className={styles.item}>
            <div className={styles.scratch}>
                <div className={styles.header}>
                    <PlatformLink
                        size={16}
                        scratch={scratch}
                        className={styles.icon}
                    />
                    <Link
                        href={scratchUrl(scratch)}
                        className={classNames(styles.link, styles.name)}
                    >
                        {scratch.name}
                    </Link>
                    <div>{/* empty div for alignment */}</div>
                </div>
                <div className={styles.metadata}>
                    <span>
                        {presetOrCompiler} • {matchPercentString} matched •{" "}
                        <TimeAgo date={scratch.last_updated} />
                    </span>
                </div>
            </div>
        </li>
    );
}

export function ScratchItemPlatformList({
    scratch,
}: { scratch: api.TerseScratch }) {
    const compilersTranslation = getTranslation("compilers");
    const compilerName = compilersTranslation.t(scratch.compiler);
    const matchPercentString = getMatchPercentString(scratch);
    const preset = api.usePreset(scratch.preset);
    const presetName = preset?.name;

    const presetOrCompiler = presetName ? (
        <Link href={presetUrl(preset)} className={styles.link}>
            {presetName}
        </Link>
    ) : (
        <span>{compilerName}</span>
    );

    return (
        <li className={styles.item}>
            <div className={styles.scratch}>
                <div className={styles.header}>
                    <Link
                        href={scratchUrl(scratch)}
                        className={classNames(styles.link, styles.name)}
                    >
                        {scratch.name}
                    </Link>
                    <div className={styles.owner}>
                        {scratch.owner ? (
                            <UserLink user={scratch.owner} />
                        ) : (
                            <div>No Owner</div>
                        )}
                    </div>
                </div>
                <div className={styles.metadata}>
                    <span>
                        {presetOrCompiler} • {matchPercentString} matched •{" "}
                        <TimeAgo date={scratch.last_updated} />
                    </span>
                </div>
            </div>
        </li>
    );
}

export function ScratchItemPresetList({
    scratch,
}: { scratch: api.TerseScratch }) {
    const matchPercentString = getMatchPercentString(scratch);

    return (
        <li className={styles.item}>
            <div className={styles.scratch}>
                <div className={styles.header}>
                    <Link
                        href={scratchUrl(scratch)}
                        className={classNames(styles.link, styles.name)}
                    >
                        {scratch.name}
                    </Link>
                    <div className={styles.metadata}>
                        <span>
                            {matchPercentString} matched •{" "}
                            <TimeAgo date={scratch.last_updated} />
                        </span>
                    </div>
                    <div className={styles.owner}>
                        {scratch.owner ? (
                            <UserLink user={scratch.owner} />
                        ) : (
                            <div>No Owner</div>
                        )}
                    </div>
                </div>
            </div>
        </li>
    );
}

export function ScratchOwnerAvatar({ scratch }: { scratch: api.TerseScratch }) {
    return (
        scratch.owner &&
        (!api.isAnonUser(scratch.owner) ? (
            userAvatarUrl(scratch.owner) && (
                <Image
                    src={userAvatarUrl(scratch.owner)}
                    alt={scratch.owner.username}
                    width={16}
                    height={16}
                    className={styles.scratchOwnerAvatar}
                />
            )
        ) : (
            <AnonymousFrogAvatar
                user={scratch.owner}
                width={16}
                height={16}
                className={styles.scratchOwnerAvatar}
            />
        ))
    );
}

export function SingleLineScratchItem({
    scratch,
    showOwner = false,
}: { scratch: api.TerseScratch; showOwner?: boolean }) {
    const matchPercentString = getMatchPercentString(scratch);

    return (
        <li className={styles.singleLine}>
            <PlatformLink size={16} scratch={scratch} className={styles.icon} />
            <Link
                href={scratchUrl(scratch)}
                className={classNames(styles.link, styles.name)}
            >
                {scratch.name}
            </Link>
            <div className={styles.metadata}>{matchPercentString}</div>
            {showOwner && <ScratchOwnerAvatar scratch={scratch} />}
        </li>
    );
}
