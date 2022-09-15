import createPersistedState from "use-persisted-state"

const theme = createPersistedState("theme")
const autoRecompile = createPersistedState("autoRecompile")
const autoRecompileDelay = createPersistedState("autoRecompileDelay")
const codeFontSize = createPersistedState("codeFontSize")
const monospaceFont = createPersistedState("monospaceFont")
const codeLineHeight = createPersistedState("codeLineHeight")
const codeColorScheme = createPersistedState("codeColorScheme")
const compareAgainstParentScratch = createPersistedState("compareAgainstParentScratch")

export const useTheme = () => theme("auto")
export const useAutoRecompileSetting = () => autoRecompile(true)
export const useAutoRecompileDelaySetting = () => autoRecompileDelay(500)
export const useCodeFontSize = () => codeFontSize(undefined)
export const useMonospaceFont = () => monospaceFont(undefined)
export const useCodeLineHeight = () => codeLineHeight(1.5)
export const useCodeColorScheme = () => codeColorScheme("Frog Dark")
export const useCompareAgainstParentScratch = () => compareAgainstParentScratch(true)

export function useIsSiteThemeDark() {
    const [theme] = useTheme()

    switch (theme) {
    case "dark":
        return true
    case "light":
        return false
    case "auto":
        return !window.matchMedia("(prefers-color-scheme: light)").matches
    }
}
