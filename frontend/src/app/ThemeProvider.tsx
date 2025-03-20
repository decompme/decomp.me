"use client";

import { useEffect } from "react";

import { applyColorScheme } from "@/lib/codemirror/color-scheme";
import * as settings from "@/lib/settings";

export default function ThemeProvider() {
    const [codeColorScheme, setCodeColorScheme] = settings.useCodeColorScheme();
    useEffect(() => {
        applyColorScheme(codeColorScheme);
    }, [codeColorScheme]);

    const isSiteThemeDark = settings.useIsSiteThemeDark();
    useEffect(() => {
        // Apply theme
        if (isSiteThemeDark) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }

        // If using the default code color scheme (Frog), pick the variant that matches the site theme
        setCodeColorScheme((current) => {
            if (current === "Frog Dark" || current === "Frog Light") {
                return isSiteThemeDark ? "Frog Dark" : "Frog Light";
            } else {
                return current;
            }
        });
    }, [isSiteThemeDark, setCodeColorScheme]);

    const [monospaceFont] = settings.useMonospaceFont();
    useEffect(() => {
        document.body.style.removeProperty("--monospace");
        if (monospaceFont) {
            document.body.style.setProperty(
                "--monospace",
                `${monospaceFont}, monospace`,
            );
        }
    }, [monospaceFont]);

    const [fontLigatures] = settings.useFontLigatures();
    useEffect(() => {
        if (fontLigatures) {
            document.body.style.setProperty(
                "font-variant-ligatures",
                "contextual",
            );
        } else {
            document.body.style.setProperty(
                "font-variant-ligatures",
                "no-contextual",
            );
        }
    }, [fontLigatures]);

    const [codeLineHeight] = settings.useCodeLineHeight();
    useEffect(() => {
        document.body.style.removeProperty("--code-line-height");
        document.body.style.setProperty(
            "--code-line-height",
            `${codeLineHeight}`,
        );
    }, [codeLineHeight]);

    return <></>;
}
