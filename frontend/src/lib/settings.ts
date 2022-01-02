import createPersistedState from "use-persisted-state"

const autoRecompile = createPersistedState("autoRecompile")

export const useAutoRecompileSetting = () => autoRecompile(true)
