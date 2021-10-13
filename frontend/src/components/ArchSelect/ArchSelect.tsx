import classNames from "classnames"

import styles from "./ArchSelect.module.scss"
import LogoN64 from "./n64.svg"
import LogoPS2 from "./ps2.svg"

const ARCHITECTURES = {
    "mips": {
        console: "Nintendo 64",
        arch: "MIPS (big-endian)",
        icon: <LogoN64 />,
    },
    "mipsel": {
        console: "PlayStation 2",
        arch: "MIPS (little-endian)",
        icon: <LogoPS2 />,
    },
}

export type Props = {
    arches: { [key: string]: string },
    value: string,
    className?: string,
    onChange: (value: string) => void,
}

export default function ArchSelect({ arches, value, onChange, className }: Props) {
    if (!value)
        onChange("mips")


    return <ul className={classNames(styles.container, className)}>
        {Object.entries(arches).map(([key, name]) => <li
            key={key}
            className={classNames(styles.arch, { [styles.selected]: value === key })}
            onClick={() => onChange(key)}
        >
            {ARCHITECTURES[key]?.icon}
            <div className={styles.labelContainer}>
                <div className={styles.consoleName}>{ARCHITECTURES[key]?.console ?? name}</div>
                <div className={styles.archName}>{ARCHITECTURES[key]?.arch}</div>
            </div>
        </li>)}
    </ul>
}
