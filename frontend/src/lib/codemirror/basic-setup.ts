import { autocompletion, closeBrackets } from "@codemirror/autocomplete";
import { history } from "@codemirror/commands";
import {
    bracketMatching,
    foldGutter,
    indentOnInput,
    indentUnit,
} from "@codemirror/language";
//import { rectangularSelection, crosshairCursor } from "@codemirror/rectangular-selection"
import { highlightSelectionMatches } from "@codemirror/search";
import { EditorState, type Extension } from "@codemirror/state";
import {
    drawSelection,
    dropCursor,
    highlightActiveLine,
    highlightActiveLineGutter,
    highlightSpecialChars,
    keymap,
    lineNumbers,
} from "@codemirror/view";
import { indentationMarkers } from "@replit/codemirror-indentation-markers";

import defaultKeymap from "./default-keymap";
import defaultTheme from "./default-theme";
import searchCount from "./search-count";

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
    searchCount,
    indentationMarkers({
        colors: {
            light: "var(--code-indentation-marker)",
            dark: "var(--code-indentation-marker)",
            activeLight: "var(--code-indentation-marker-active)",
            activeDark: "var(--code-indentation-marker-active)",
        },
    }),
    keymap.of(defaultKeymap),
    indentUnit.of("    "),
    defaultTheme,
];

export const decompileSetup: Extension = [
    EditorState.readOnly.of(true),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    highlightActiveLine(),
    searchCount,
    indentationMarkers({
        colors: {
            light: "var(--code-indentation-marker)",
            dark: "var(--code-indentation-marker)",
            activeLight: "var(--code-indentation-marker-active)",
            activeDark: "var(--code-indentation-marker-active)",
        },
    }),
    keymap.of(defaultKeymap),
    indentUnit.of("    "),
    defaultTheme,
];

export default basicSetup;
