import { AlertIcon, CheckIcon } from "@primer/octicons-react"
import classNames from "classnames"

import styles from "./ScoreBadge.module.scss"

function round(num: number) {
    return Math.round((num + Number.EPSILON) * 100) / 100
}

function calculateScore(score: number, max_score: number) {
    if (score > max_score) {
        return 0
    }

    return round((1 - (score / max_score)) * 100)
}

export type Props = {
    score: number
    max_score: number
}

export default function ScoreBadge({ score, max_score }: Props) {
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
            {score} ({calculateScore(score, max_score)}%)
        </div>
    }
}
