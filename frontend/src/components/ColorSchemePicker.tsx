import { type ColorScheme, DARK_THEMES, getColors, LIGHT_THEMES } from "@/lib/codemirror/color-scheme"
import { useIsSiteThemeDark } from "@/lib/settings"

import ColorSchemeEditor from "./ColorSchemeEditor"
import styles from "./ColorSchemePicker.module.scss"

export interface Props {
    scheme: ColorScheme
    onChange: (scheme: ColorScheme) => void
}

export default function ColorSchemePicker({ scheme, onChange }: Props) {
    const themes = useIsSiteThemeDark() ? DARK_THEMES : LIGHT_THEMES

    return <div className={styles.container}>
        <ul className={styles.presets}>
            {themes.map(theme => {
                return <li key={theme}>
                    <button
                        className={styles.box}
                        onClick={() => onChange(theme)}
                        data-active={scheme === theme}
                    >
                        {theme}
                        <div className={styles.colors}>
                            {Object.entries(getColors(theme)).map(([key, color]) => (
                                <div
                                    key={key}
                                    style={{ backgroundColor: color }}
                                />)
                            )}
                        </div>
                    </button>
                </li>
            })}
        </ul>

        <ColorSchemeEditor scheme={scheme} onChange={onChange} />
    </div>
}
