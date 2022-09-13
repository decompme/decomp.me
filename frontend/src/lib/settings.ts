import createPersistedState from "use-persisted-state"

const theme = createPersistedState("theme")
const autoRecompile = createPersistedState("autoRecompile")
const autoRecompileDelay = createPersistedState("autoRecompileDelay")
const codeFontSize = createPersistedState("codeFontSize")
const diffFontSize = createPersistedState("diffFontSize")
const monospaceFont = createPersistedState("monospaceFont")
const codeLineHeight = createPersistedState("codeLineHeight")
const codeColorScheme = createPersistedState("codeColorScheme")

export const DEFAULT_CODE_COLOR_SCHEME = {
    background: "#121415",
    cursor: "#ffffff",

    foreground: "#647a97",
    keyword: "#7f83ff",
    variable: "#8599b3",
    type: "#45b8ff",
    function: "#ff4a98",
    punctuation: "#656f7e",
    operator: "#7f83ff",
    comment: "#465173",
    number: "#0afafa",
    bool: "#f248bc",
    string: "#face0a",
    character: "#cefa0a",
    preprocessor: "#3bff6c",
}

export const useTheme = () => theme("auto")
export const useAutoRecompileSetting = () => autoRecompile(true)
export const useAutoRecompileDelaySetting = () => autoRecompileDelay(500)
export const useCodeFontSize = () => codeFontSize(undefined)
export const useDiffFontSize = () => diffFontSize(undefined)
export const useMonospaceFont = () => monospaceFont(undefined)
export const useCodeLineHeight = () => codeLineHeight(1.5)
export const useCodeColorScheme = () => codeColorScheme(DEFAULT_CODE_COLOR_SCHEME)
