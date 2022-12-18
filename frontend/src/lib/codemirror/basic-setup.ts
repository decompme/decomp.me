import { autocompletion, closeBrackets } from "@codemirror/autocomplete"
import { history } from "@codemirror/commands"
import { bracketMatching, foldGutter, indentOnInput, indentUnit } from "@codemirror/language"
//import { rectangularSelection, crosshairCursor } from "@codemirror/rectangular-selection"
import { highlightSelectionMatches } from "@codemirror/search"
import { Extension, EditorState } from "@codemirror/state"
import { lineNumbers, highlightActiveLineGutter, keymap, highlightSpecialChars, drawSelection, highlightActiveLine, dropCursor } from "@codemirror/view"
import { indentationMarkers } from "@replit/codemirror-indentation-markers"

import defaultKeymap from "./default-keymap"
import defaultTheme from "./default-theme"

const basicSetup: Extension = [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    //rectangularSelection({ eventFilter: evt => evt.ctrlKey }),
    //crosshairCursor({ key: "Control" }),
    highlightActiveLine(),
    highlightSelectionMatches({ highlightWordAroundCursor: true }),
    indentationMarkers(),
    keymap.of(defaultKeymap),
    indentUnit.of("    "),
    defaultTheme,
]

export const decompileSetup: Extension = [
    EditorState.readOnly.of(true),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    highlightActiveLine(),
    indentationMarkers(),
    keymap.of(defaultKeymap),
    indentUnit.of("    "),
    defaultTheme,
]

export default basicSetup
