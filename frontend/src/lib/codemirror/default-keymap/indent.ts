import { indentMore } from "@codemirror/commands"
import type { StateCommand } from "@codemirror/state"

export const indent: StateCommand = ({ state, dispatch }) => {
    if (state.selection.ranges.some(r => !r.empty)) return indentMore({ state, dispatch })
    dispatch(state.update(state.replaceSelection("    "), { scrollIntoView: true, userEvent: "input" }))
    return true
}
