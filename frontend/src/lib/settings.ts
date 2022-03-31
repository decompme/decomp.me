import createPersistedState from "use-persisted-state"

const autoRecompile = createPersistedState("autoRecompile")
const autoRecompileDelay = createPersistedState("autoRecompileDelay")
const codeFontSize = createPersistedState("codeFontSize")
const diffFontSize = createPersistedState("diffFontSize")

export const useAutoRecompileSetting = () => autoRecompile(true)
export const useAutoRecompileDelaySetting = () => autoRecompileDelay(500)
export const useCodeFontSize = () => codeFontSize(undefined)
export const useDiffFontSize = () => diffFontSize(undefined)
