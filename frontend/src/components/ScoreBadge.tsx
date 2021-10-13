import { AlertIcon, CheckIcon } from "@primer/octicons-react"
import classNames from "classnames"

import styles from "./ScoreBadge.module.scss"

export type Props = {
    score: number
}

export default function ScoreBadge({ score }: Props) {
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
            {score}
        </div>
    }
}
