import { AlertIcon, CheckIcon } from "@primer/octicons-react";
import clsx from "clsx";

import styles from "./ScoreBadge.module.scss";

export function calculateScorePercent(score: number, maxScore: number): number {
    if (score > maxScore) {
        return 0;
    }

    if (!maxScore) {
        return 0;
    }

    return (1 - score / maxScore) * 100;
}

export function percentToString(percent: number): string {
    // If the percent is an integer, don't show the decimal
    if (Math.floor(percent * 100) / 100 === Math.floor(percent)) {
        return `${Math.floor(percent)}%`;
    }
    // If percent is between 99.99 and 100 exclusive, always round down
    if (99.99 < percent && percent < 100) {
        return "99.99%";
    }
    return `${percent.toFixed(2)}%`;
}

export function getScoreText(
    score: number,
    maxScore: number,
    matchOverride: boolean,
): string {
    if (score === -1) {
        return "No score available";
    } else if (score === 0) {
        return "0 (100%) 🎊";
    } else if (matchOverride) {
        return `${score} (100%) 🎊 (override)`;
    } else {
        const percent = calculateScorePercent(score, maxScore);

        return `${score} (${percentToString(percent)})`;
    }
}

export function getScoreAsFraction(score: number, maxScore: number): string {
    if (score === -1) {
        return `???/${maxScore}`;
    } else {
        return `${maxScore - score}/${maxScore}`;
    }
}

export type Props = {
    score: number;
    maxScore: number;
    matchOverride: boolean;
    compiledSuccessfully: boolean;
};

export default function ScoreBadge({
    score,
    maxScore,
    matchOverride,
    compiledSuccessfully,
}: Props) {
    if (!compiledSuccessfully || score === -1) {
        return (
            <div
                className={clsx(styles.badge, { [styles.error]: true })}
                title="Does not compile"
            >
                <AlertIcon className={styles.icon} />
            </div>
        );
    } else if (score === 0) {
        return (
            <div
                className={clsx(styles.badge, { [styles.match]: true })}
                title="Match"
            >
                <CheckIcon className={styles.icon} />
            </div>
        );
    } else {
        const text = getScoreText(score, maxScore, matchOverride);
        const title = getScoreAsFraction(score, maxScore);

        return (
            <div className={styles.badge} aria-label="Score" title={title}>
                {text}
            </div>
        );
    }
}
