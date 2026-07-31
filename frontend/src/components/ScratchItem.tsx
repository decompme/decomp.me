"use client";

import { type ReactNode, useState } from "react";

import Image from "next/image";
import Link from "@/components/Link";

import { RepoForkedIcon, TrashIcon } from "@primer/octicons-react";
import clsx from "clsx";

import TimeAgo from "@/components/TimeAgo";
import * as api from "@/lib/api";
import { presetUrl, scratchUrl, userAvatarUrl } from "@/lib/api/urls";

import getTranslation from "@/lib/i18n/translate";

import AnonymousFrogAvatar from "./Frog/AnonymousFrog";
import Button from "./Button";
import PlatformLink from "./PlatformLink";
import { calculateScorePercent, percentToString } from "./ScoreBadge";
import styles from "./ScratchItem.module.scss";
import UserLink from "./user/UserLink";

type MatchPercentSource = api.TerseScratch | api.BestFork;
export type ScratchItemSkeletonVariant = "row" | "compact";

function isMatchPercentOverride(source: MatchPercentSource) {
    return "match_override" in source ? source.match_override : source.is_match;
}

export function getMatchPercentString(source: MatchPercentSource) {
    if (source.score === -1) {
        return "0%";
    }
    if (isMatchPercentOverride(source)) {
        return "100%";
    }
    const matchPercent = calculateScorePercent(source.score, source.max_score);
    const matchPercentString = percentToString(matchPercent);

    return matchPercentString;
}

export function Improvement({
    improvement = null,
}: { improvement?: api.BestFork | null }) {
    if (!improvement) return null;
    const ownerName = improvement.owner?.username ?? "Someone";

    const improvementPercentString = getMatchPercentString(improvement);

    const improvementLabel = improvement.is_match
        ? `${ownerName} has a fork that has matched this scratch`
        : `${ownerName} has a fork that has improved this scratch to ${improvementPercentString} matched`;

    return (
        <Link
            href={`/scratch/${improvement.slug}`}
            className={clsx(styles.improvement, {
                [styles.match]: improvement.is_match,
            })}
            title={improvementLabel}
            aria-label={improvementLabel}
        >
            <RepoForkedIcon size={14} className={styles.improvementIcon} />
            <span>{improvementPercentString}</span>
        </Link>
    );
}

function DeleteButton({
    scratch,
    onDeleteCallback,
}: {
    scratch: api.TerseScratch;
    onDeleteCallback: () => void;
}) {
    const [isDeleting, setIsDeleting] = useState(false);

    const deleteScratch = async (
        scratch: api.TerseScratch,
        isShiftPressed: boolean,
    ) => {
        if (isDeleting) {
            return;
        }

        setIsDeleting(true);
        if (
            !isShiftPressed &&
            !confirm(
                "Are you sure you want to delete this scratch? This action cannot be undone.",
            )
        ) {
            setIsDeleting(false);
            return;
        }

        try {
            await api.delete_(scratchUrl(scratch), {});
            // Hide deleted element to avoid performing a page refresh, and allow deleting more scratches
            onDeleteCallback();
        } catch (error) {
            alert("An error occurred trying to deleting this scratch.");
            setIsDeleting(false);
            throw error;
        }
        setIsDeleting(false);
    };

    return (
        <Button
            onClick={(evt) => deleteScratch(scratch, evt.shiftKey)}
            className="!border-none !py-1 rounded-md text-xs md:min-w-20"
            danger
        >
            <TrashIcon size={14} />
            <span className="hidden md:inline">Delete</span>
        </Button>
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

function ScratchPresetOrCompiler({ scratch }: { scratch: api.TerseScratch }) {
    const compilersTranslation = getTranslation("compilers");
    const compilerName = compilersTranslation.t(scratch.compiler);
    const preset = api.usePreset(scratch.preset);
    const presetName = preset?.name;

    return presetName ? (
        <Link href={presetUrl(preset)} className={styles.link}>
            {presetName}
        </Link>
    ) : (
        <span>{compilerName}</span>
    );
}

function ScratchMetadata({
    scratch,
    showPresetOrCompiler,
}: {
    scratch: api.TerseScratch;
    showPresetOrCompiler: boolean;
}) {
    const matchPercentString = getMatchPercentString(scratch);

    return (
        <span className={styles.metadataText}>
            {showPresetOrCompiler && (
                <>
                    <ScratchPresetOrCompiler scratch={scratch} /> •{" "}
                </>
            )}
            {matchPercentString} matched •{" "}
            <TimeAgo date={scratch.last_updated} />
        </span>
    );
}

function ScratchItemRow({
    scratch,
    children,
    showOwner = true,
    showPlatform = true,
    showPresetOrCompiler = true,
    showDeleteButton = false,
}: {
    scratch: api.TerseScratch;
    children?: ReactNode;
    showOwner?: boolean;
    showPlatform?: boolean;
    showPresetOrCompiler?: boolean;
    showDeleteButton?: boolean;
}) {
    const [showElement, setShowElement] = useState(true);
    const onDeleteCallback = () => setShowElement(false);

    return (
        <>
            {showElement && (
                <li className={styles.item}>
                    <div className={styles.scratch}>
                        <div className={styles.header}>
                            <ScratchItemTitle
                                scratch={scratch}
                                showPlatform={showPlatform}
                            />
                            <span className={styles.improvementSlot}>
                                <Improvement improvement={scratch.best_fork} />
                            </span>
                        </div>
                        <div className={styles.metadata}>
                            <ScratchMetadata
                                scratch={scratch}
                                showPresetOrCompiler={showPresetOrCompiler}
                            />
                            {(children || showOwner || showDeleteButton) && (
                                <div className={styles.metadataAside}>
                                    {children && (
                                        <div className={styles.actions}>
                                            {children}
                                        </div>
                                    )}
                                    {showOwner && (
                                        <ScratchOwner scratch={scratch} />
                                    )}
                                    {showDeleteButton && (
                                        <DeleteButton
                                            scratch={scratch}
                                            onDeleteCallback={onDeleteCallback}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </li>
            )}
        </>
    );
}

export function ScratchItem({
    scratch,
    children,
}: {
    scratch: api.TerseScratch;
    children?: ReactNode;
    showDeleteButton?: boolean;
}) {
    return <ScratchItemRow scratch={scratch}>{children}</ScratchItemRow>;
}

export function ScratchItemNoOwner({
    scratch,
    showDeleteButton,
}: { scratch: api.TerseScratch; showDeleteButton?: boolean }) {
    return (
        <ScratchItemRow
            scratch={scratch}
            showOwner={false}
            showDeleteButton={showDeleteButton}
        />
    );
}

export function ScratchItemPlatformList({
    scratch,
}: { scratch: api.TerseScratch }) {
    return <ScratchItemRow scratch={scratch} showPlatform={false} />;
}

export function ScratchItemPresetList({
    scratch,
}: { scratch: api.TerseScratch }) {
    return (
        <ScratchItemRow
            scratch={scratch}
            showPlatform={false}
            showPresetOrCompiler={false}
        />
    );
}

export function ScratchItemSkeleton({
    variant = "row",
}: {
    variant?: ScratchItemSkeletonVariant;
}) {
    return (
        <li
            className={clsx(styles.skeletonItem, {
                [styles.skeletonCompact]: variant === "compact",
            })}
            aria-hidden="true"
        >
            {variant === "compact" ? (
                <>
                    <span className={styles.skeletonIcon} />
                    <span className={styles.skeletonTitle} />
                    <span className={styles.skeletonPill} />
                </>
            ) : (
                <>
                    <div className={styles.skeletonHeader}>
                        <span className={styles.skeletonIcon} />
                        <span className={styles.skeletonTitle} />
                        <span className={styles.skeletonBadge} />
                    </div>
                    <div className={styles.skeletonMetadata}>
                        <span className={styles.skeletonMetaLong} />
                        <span className={styles.skeletonMetaShort} />
                    </div>
                </>
            )}
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
