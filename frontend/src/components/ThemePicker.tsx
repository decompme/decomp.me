import { LightBulbIcon, MoonIcon, SunIcon } from "@primer/octicons-react"

import { isPrefersColorSchemeDark } from "@/lib/settings"

import styles from "./ThemePicker.module.scss"

export type Theme = "auto" | "light" | "dark"

export interface Props {
    theme: Theme
    onChange: (theme: Theme) => void
}

export default function ThemePicker({ theme, onChange }: Props) {
    const autoTheme = isPrefersColorSchemeDark() ? "dark" : "light"

    return <div className={styles.container}>
        <button className={styles.box} onClick={() => onChange("auto")} data-active={theme === "auto"}>
            <div className={styles.boxHeader}>
                <LightBulbIcon />
                System ({autoTheme})
            </div>
        </button>
        <button className={styles.box} onClick={() => onChange("light")} data-active={theme === "light"}>
            <div className={styles.boxHeader}>
                <SunIcon />
                Light theme
            </div>
        </button>
        <button className={styles.box} onClick={() => onChange("dark")} data-active={theme === "dark"}>
            <div className={styles.boxHeader}>
                <MoonIcon />
                Dark theme
            </div>
        </button>
    </div>
}
