import classNames from "classnames"

import LogoGameCube from "./gamecube.svg"
import LogoN64 from "./n64.svg"
import styles from "./PlatformSelect.module.scss"
import LogoPS1 from "./ps1.svg"
import LogoPS2 from "./ps2.svg"

const ICONS = {
    "gamecube": <LogoGameCube />,
    "n64": <LogoN64 />,
    "ps1": <LogoPS1 />,
    "ps2": <LogoPS2 />,
}

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
            {ICONS[key]}
            <div className={styles.labelContainer}>
                <div className={styles.consoleName}>{platform.name}</div>
                <div className={styles.platformName}>{platform.description}</div>
            </div>
        </li>)}
    </ul>
}
