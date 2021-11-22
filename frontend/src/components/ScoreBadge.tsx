import { AlertIcon, CheckIcon } from "@primer/octicons-react"
import classNames from "classnames"

import styles from "./ScoreBadge.module.scss"

function calculateScorePercent(score: number, maxScore: number): string {
    if (score > maxScore) {
        return "0"
    }

    return ((1 - (score / maxScore)) * 100).toFixed(2)
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
        return <div className={styles.badge} aria-label="Score">
            {score} ({calculateScorePercent(score, maxScore)}%)
        </div>
    }
}
