import createPersistedState from "use-persisted-state"

import type { Theme } from "@/components/ThemePicker"

import type { ColorScheme } from "./codemirror/color-scheme"

const theme = createPersistedState<Theme>("theme")
const autoRecompile = createPersistedState<boolean>("autoRecompile")
const autoRecompileDelay = createPersistedState<number>("autoRecompileDelay")
const codeFontSize = createPersistedState<number>("codeFontSize")
const monospaceFont = createPersistedState<string | undefined>("monospaceFont")
const codeLineHeight = createPersistedState<number>("codeLineHeight")
const codeColorScheme = createPersistedState<ColorScheme>("codeColorScheme")
const languageServerEnabled = createPersistedState<boolean>("languageServerEnabled")
const matchProgressBarEnabled = createPersistedState<boolean>("matchProgressBarEnabled")
const vimModeEnabled = createPersistedState<boolean>("vimModeEnabled")
const threeWayDiffBase = createPersistedState<ThreeWayDiffBase>("threeWayDiffBase")
const objdiffClientEnabled = createPersistedState<boolean>("objdiffClientEnabled")

export enum ThreeWayDiffBase {
    SAVED = "saved",
    PREV = "prev",
}

export const useTheme = () => theme("auto")
export const useAutoRecompileSetting = () => autoRecompile(true)
export const useAutoRecompileDelaySetting = () => autoRecompileDelay(500)
export const useCodeFontSize = () => codeFontSize(11)
export const useMonospaceFont = () => monospaceFont(undefined)
export const useCodeLineHeight = () => codeLineHeight(1.5)
export const useCodeColorScheme = () => codeColorScheme("Frog Dark")
export const useLanguageServerEnabled = () => languageServerEnabled(false)
export const useMatchProgressBarEnabled = () => matchProgressBarEnabled(true)
export const useVimModeEnabled = () => vimModeEnabled(false)
export const useThreeWayDiffBase = () => threeWayDiffBase(ThreeWayDiffBase.SAVED)
export const useObjdiffClientEnabled = () => objdiffClientEnabled(false)

export function useIsSiteThemeDark() {
    const [theme] = useTheme()

    switch (theme) {
    case "dark":
        return true
    case "light":
        return false
    case "auto":
        return isPrefersColorSchemeDark()
    }
}

export function isPrefersColorSchemeDark() {
    // Default to dark theme on server
    if (typeof window === "undefined") {
        return true
    }

    return !window.matchMedia("(prefers-color-scheme: light)").matches
}
