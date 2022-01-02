import { AlertIcon, CheckIcon } from "@primer/octicons-react"
import classNames from "classnames"

import styles from "./ScoreBadge.module.scss"

function calculateScorePercent(score: number, maxScore: number): number {
    if (score > maxScore) {
        return 0
    }

    return ((1 - (score / maxScore)) * 100)
}

export function getScoreText(score: number, maxScore: number): string {
    if (score === -1) {
        return "No score available"
    } else if (score === 0) {
        return "0 (100%) 🎊"
    } else {
        const percent = calculateScorePercent(score, maxScore)

        if (Math.floor(percent * 100) / 100 === Math.floor(percent)) // If the percent is an integer, don't show the decimal
            return `${score} (${Math.floor(percent)}%)`
        else
            return `${score} (${percent.toFixed(2)}%)`
    }
}

export type Props = {
    score: number
    maxScore: number
}

export default function ScoreBadge({ score, maxScore }: Props) {
    if (score === -1) {
        return <div className={classNames(styles.badge, { [styles.error]: true })}>
            <AlertIcon className={styles.icon} />
        </div>
    } else if (score === 0) {
        return <div className={classNames(styles.badge, { [styles.match]: true })}>
            <CheckIcon className={styles.icon} />
        </div>
    } else {
        const text = getScoreText(score, maxScore)
        return <div className={styles.badge} aria-label="Score">
            {text}
        </div>
    }
}
