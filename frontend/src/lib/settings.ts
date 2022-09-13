import createPersistedState from "use-persisted-state"

const theme = createPersistedState("theme")
const autoRecompile = createPersistedState("autoRecompile")
const autoRecompileDelay = createPersistedState("autoRecompileDelay")
const codeFontSize = createPersistedState("codeFontSize")
const diffFontSize = createPersistedState("diffFontSize")
const monospaceFont = createPersistedState("monospaceFont")
const codeLineHeight = createPersistedState("codeLineHeight")

export const useTheme = () => theme("auto")
export const useAutoRecompileSetting = () => autoRecompile(true)
export const useAutoRecompileDelaySetting = () => autoRecompileDelay(500)
export const useCodeFontSize = () => codeFontSize(undefined)
export const useDiffFontSize = () => diffFontSize(undefined)
export const useMonospaceFont = () => monospaceFont(undefined)
export const useCodeLineHeight = () => codeLineHeight(1.5)
