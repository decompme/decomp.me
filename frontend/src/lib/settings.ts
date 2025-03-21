import type { Theme } from "@/components/ThemePicker";

import type { ColorScheme } from "./codemirror/color-scheme";
import { createStorageKey } from "./storage";

export enum ThreeWayDiffBase {
    SAVED = "saved",
    PREV = "prev",
}

export const useTheme = createStorageKey<Theme>("theme", "auto");
export const useAutoRecompileSetting = createStorageKey<boolean>(
    "autoRecompile",
    true,
);
export const useAutoRecompileDelaySetting = createStorageKey<number>(
    "autoRecompileDelay",
    500,
);
export const useCodeFontSize = createStorageKey<number>("codeFontSize", 13);
export const useMonospaceFont = createStorageKey<string>("monospaceFont", "");
export const useFontLigatures = createStorageKey<boolean>(
    "fontLigatures",
    false,
);
export const useCodeLineHeight = createStorageKey<number>(
    "codeLineHeight",
    1.5,
);
export const useCodeColorScheme = createStorageKey<ColorScheme>(
    "codeColorScheme",
    "Frog Dark",
);
export const useLanguageServerEnabled = createStorageKey<boolean>(
    "languageServerEnabled",
    false,
);
export const useMatchProgressBarEnabled = createStorageKey<boolean>(
    "matchProgressBarEnabled",
    true,
);
export const useVimModeEnabled = createStorageKey<boolean>(
    "vimModeEnabled",
    false,
);
export const useThreeWayDiffBase = createStorageKey<ThreeWayDiffBase>(
    "threeWayDiffBase",
    ThreeWayDiffBase.SAVED,
);
export const useObjdiffClientEnabled = createStorageKey<boolean>(
    "objdiffClientEnabled",
    false,
);

export function useIsSiteThemeDark() {
    const [theme] = useTheme();

    switch (theme) {
        case "dark":
            return true;
        case "light":
            return false;
        case "auto":
            return isPrefersColorSchemeDark();
    }
}

export function isPrefersColorSchemeDark() {
    // Default to dark theme on server
    if (typeof window === "undefined") {
        return true;
    }

    return !window.matchMedia("(prefers-color-scheme: light)").matches;
}
