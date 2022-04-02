import { autocompletion } from "@codemirror/autocomplete"
import { closeBrackets } from "@codemirror/closebrackets"
import { foldGutter } from "@codemirror/fold"
import { lineNumbers, highlightActiveLineGutter } from "@codemirror/gutter"
import { history } from "@codemirror/history"
import { indentOnInput, indentUnit } from "@codemirror/language"
import { bracketMatching } from "@codemirror/matchbrackets"
//import { rectangularSelection, crosshairCursor } from "@codemirror/rectangular-selection"
import { highlightSelectionMatches } from "@codemirror/search"
import { Extension, EditorState } from "@codemirror/state"
import { keymap, highlightSpecialChars, drawSelection, highlightActiveLine, dropCursor } from "@codemirror/view"
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

export default basicSetup
