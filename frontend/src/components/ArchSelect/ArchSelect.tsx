import classNames from "classnames"

import styles from "./ArchSelect.module.scss"
import LogoN64 from "./n64.svg"
import LogoPS2 from "./ps2.svg"

const ICONS = {
    "mips": <LogoN64 />,
    "mipsel": <LogoPS2 />,
}

export type Props = {
    arches: {
        [key: string]: {
            name: string
            description: string
        }
    }
    value: string
    className?: string
    onChange: (value: string) => void
}

export default function ArchSelect({ arches, value, onChange, className }: Props) {
    if (!value)
        onChange("mips")


    return <ul className={classNames(styles.container, className)}>
        {Object.entries(arches).map(([key, arch]) => <li
            key={key}
            className={classNames(styles.arch, { [styles.selected]: value === key })}
            onClick={() => onChange(key)}
        >
            {ICONS[key]}
            <div className={styles.labelContainer}>
                <div className={styles.consoleName}>{arch.name}</div>
                <div className={styles.archName}>{arch.description}</div>
            </div>
        </li>)}
    </ul>
}
