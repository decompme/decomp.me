"use client";

import type { ReactNode } from "react";

import Image from "next/image";
import Link from "next/link";

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
                    <PlatformLink
                        size={16}
                        scratch={scratch}
                        className={styles.icon}
                    />
                    <Link
                        href={scratchUrl(scratch)}
                        prefetch={false}
                        className={clsx(styles.link, styles.name)}
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
                    <PlatformLink
                        size={16}
                        scratch={scratch}
                        className={styles.icon}
                    />
                    <Link
                        href={scratchUrl(scratch)}
                        prefetch={false}
                        className={clsx(styles.link, styles.name)}
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
                    <Link
                        href={scratchUrl(scratch)}
                        prefetch={false}
                        className={clsx(styles.link, styles.name)}
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
                        prefetch={false}
                        className={clsx(styles.link, styles.name)}
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
                prefetch={false}
                className={clsx(styles.link, styles.name)}
            >
                {scratch.name}
            </Link>
            <div className={styles.metadata}>{matchPercentString}</div>
            {showOwner && <ScratchOwnerAvatar scratch={scratch} />}
        </li>
    );
}
