import createPersistedState from "use-persisted-state"

const autoRecompile = createPersistedState("autoRecompile")
const autoRecompileDelay = createPersistedState("autoRecompileDelay")

export const useAutoRecompileSetting = () => autoRecompile(true)
export const useAutoRecompileDelaySetting = () => autoRecompileDelay(500)
