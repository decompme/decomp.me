"use client";

import type { ReactNode } from "react";

import Image from "next/image";
import Link from "next/link";

import { RepoForkedIcon } from "@primer/octicons-react";
import clsx from "clsx";

import TimeAgo from "@/components/TimeAgo";
import * as api from "@/lib/api";
import { presetUrl, scratchUrl, userAvatarUrl } from "@/lib/api/urls";

import getTranslation from "@/lib/i18n/translate";

import AnonymousFrogAvatar from "./Frog/AnonymousFrog";
import PlatformLink from "./PlatformLink";
import { calculateScorePercent, percentToString } from "./ScoreBadge";
import styles from "./ScratchItem.module.scss";
import UserLink from "./user/UserLink";

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

function percentToMaxPrecisionString(percent: number, maxPrecision: number) {
    return `${percent.toFixed(maxPrecision).replace(/\.?0+$/, "")}%`;
}

export function Improvement({
    improvement = null,
}: { improvement?: api.BestFork | null }) {
    if (!improvement) return null;
    const ownerName = improvement.owner?.username ?? "Someone";

    const improvementPercentString = percentToMaxPrecisionString(
        calculateScorePercent(improvement.score, improvement.max_score),
        1,
    );

    const improvementLabel = improvement.is_match
        ? `${ownerName} has a fork that has matched this scratch`
        : `${ownerName} has a fork that has improved this scratch to ${improvementPercentString} matched`;

    return (
        <Link
            href={`/scratch/${improvement.slug}`}
            prefetch={false}
            className={clsx(styles.improvement, {
                [styles.match]: improvement.is_match,
            })}
            title={improvementLabel}
            aria-label={improvementLabel}
        >
            {improvement.is_match ? (
                <>
                    <RepoForkedIcon
                        size={14}
                        className={styles.improvementIcon}
                    />
                    <span>100%</span>
                </>
            ) : (
                <>
                    <RepoForkedIcon
                        size={14}
                        className={styles.improvementIcon}
                    />
                    <span>{improvementPercentString}</span>
                </>
            )}
        </Link>
    );
}

function ScratchItemTitle({
    scratch,
    showPlatform,
}: { scratch: api.TerseScratch; showPlatform?: boolean }) {
    return (
        <div className={styles.title}>
            {showPlatform && (
                <PlatformLink
                    size={16}
                    platform={scratch.platform}
                    className={styles.icon}
                />
            )}
            <Link
                href={scratchUrl(scratch)}
                prefetch={false}
                className={clsx(styles.link, styles.name)}
            >
                {scratch.name}
            </Link>
        </div>
    );
}

function ScratchOwner({ scratch }: { scratch: api.TerseScratch }) {
    return (
        <div className={styles.owner}>
            {scratch.owner ? (
                <UserLink user={scratch.owner} truncateUsername={false} />
            ) : (
                <div>No Owner</div>
            )}
        </div>
    );
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
        <Link href={presetUrl(preset)} prefetch={false} className={styles.link}>
            {presetName}
        </Link>
    ) : (
        <span>{compilerName}</span>
    );

    return (
        <li className={styles.item}>
            <div className={styles.scratch}>
                <div className={styles.header}>
                    <ScratchItemTitle scratch={scratch} showPlatform />
                    <span className={styles.improvementSlot}>
                        <Improvement improvement={scratch.best_fork} />
                    </span>
                </div>
                <div className={styles.metadata}>
                    <span className={styles.metadataText}>
                        {presetOrCompiler} • {matchPercentString} matched •{" "}
                        <TimeAgo date={scratch.last_updated} />
                    </span>
                    <div className={styles.metadataAside}>
                        {children && (
                            <div className={styles.actions}>{children}</div>
                        )}
                        <ScratchOwner scratch={scratch} />
                    </div>
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
        <Link href={presetUrl(preset)} prefetch={false} className={styles.link}>
            {presetName}
        </Link>
    ) : (
        <span>{compilerName}</span>
    );

    return (
        <li className={styles.item}>
            <div className={styles.scratch}>
                <div className={styles.header}>
                    <ScratchItemTitle scratch={scratch} showPlatform />
                    <span className={styles.improvementSlot}>
                        <Improvement improvement={scratch.best_fork} />
                    </span>
                </div>
                <div className={styles.metadata}>
                    <span className={styles.metadataText}>
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
        <Link href={presetUrl(preset)} prefetch={false} className={styles.link}>
            {presetName}
        </Link>
    ) : (
        <span>{compilerName}</span>
    );

    return (
        <li className={styles.item}>
            <div className={styles.scratch}>
                <div className={styles.header}>
                    <ScratchItemTitle scratch={scratch} />
                    <span className={styles.improvementSlot}>
                        <Improvement improvement={scratch.best_fork} />
                    </span>
                </div>
                <div className={styles.metadata}>
                    <span className={styles.metadataText}>
                        {presetOrCompiler} • {matchPercentString} matched •{" "}
                        <TimeAgo date={scratch.last_updated} />
                    </span>
                    <ScratchOwner scratch={scratch} />
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
                    <ScratchItemTitle scratch={scratch} />
                    <span className={styles.improvementSlot}>
                        <Improvement improvement={scratch.best_fork} />
                    </span>
                </div>
                <div className={styles.metadata}>
                    <span className={styles.metadataText}>
                        {matchPercentString} matched •{" "}
                        <TimeAgo date={scratch.last_updated} />
                    </span>
                    <ScratchOwner scratch={scratch} />
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
    return (
        <li className={styles.singleLine}>
            <PlatformLink
                size={16}
                platform={scratch.platform}
                className={styles.icon}
            />
            <Link
                href={scratchUrl(scratch)}
                prefetch={false}
                className={clsx(styles.link, styles.name)}
            >
                {scratch.name}
            </Link>
            {showOwner && <ScratchOwnerAvatar scratch={scratch} />}
            <span className={styles.improvementSlot}>
                <Improvement improvement={scratch.best_fork} />
            </span>
        </li>
    );
}
