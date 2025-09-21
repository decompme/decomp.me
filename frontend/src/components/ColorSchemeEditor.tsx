import { useEffect, useState } from "react";

import isDarkColor from "is-dark-color";
import { HexColorPicker, HexColorInput } from "react-colorful";

import {
    COLOR_NAMES,
    type ColorScheme,
    getColors,
} from "@/lib/codemirror/color-scheme";

import styles from "./ColorSchemeEditor.module.scss";
import ErrorBoundary from "./ErrorBoundary";

function Color({
    color,
    name,
    onChange,
}: {
    color: string;
    name: string;
    onChange: (color: string) => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        try {
            setIsDark(isDarkColor(color));
        } catch (error) {
            // Ignore
        }
    }, [color]);

    return (
        <li
            aria-label={name}
            className={styles.color}
            tabIndex={0}
            onFocus={() => setIsEditing(true)}
            onClick={() => setIsEditing(true)}
            onBlur={() => setIsEditing(false)}
            data-active={isEditing}
            style={{
                color: isDark ? "white" : "black",
                backgroundColor: color,
            }}
        >
            {!isEditing && <label>{name}</label>}
            {isEditing && (
                <>
                    <HexColorPicker color={color} onChange={onChange} />
                    <HexColorInput
                        autoFocus={true}
                        onFocus={(evt) => evt.target.select()}
                        color={color}
                        onChange={onChange}
                        prefixed
                    />
                </>
            )}
        </li>
    );
}

export interface Props {
    scheme: ColorScheme;
    onChange: (scheme: ColorScheme) => void;
}

export default function ColorSchemeEditor({ scheme, onChange }: Props) {
    const colors = getColors(scheme);

    const els = [];
    for (const [key, name] of Object.entries(COLOR_NAMES)) {
        els.push(
            <Color
                key={key}
                color={colors[key as keyof typeof colors]}
                name={name}
                onChange={(color) => onChange({ ...colors, [key]: color })}
            />,
        );
    }

    return (
        <ErrorBoundary onError={() => onChange("Frog Dark")}>
            <ul className={styles.container}>{els}</ul>
        </ErrorBoundary>
    );
}
