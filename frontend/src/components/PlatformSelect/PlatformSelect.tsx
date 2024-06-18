import classNames from "classnames"

import { PlatformIcon } from "./PlatformIcon"
import styles from "./PlatformSelect.module.scss"

export type Props = {
    platforms: {
        [key: string]: {
            name: string
            description: string
        }
    }
    value: string
    className?: string
    onChange: (value: string) => void
}

export default function PlatformSelect({ platforms, value, onChange, className }: Props) {
    if (!value)
        onChange("n64")

    return <ul className={classNames(styles.container, className)}>
        {Object.entries(platforms).map(([key, platform]) => <li
            key={key}
            className={classNames(styles.platform, { [styles.selected]: value === key })}
            onClick={() => onChange(key)}
        >
            <PlatformIcon clickable={false} platform={key} />
            <div className={styles.labelContainer}>
                <div className={styles.consoleName}>{platform.name}</div>
                <div className={styles.platformName}>{platform.description}</div>
            </div>
        </li>)}
    </ul>
}
