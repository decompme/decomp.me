import {
    acceptCompletion,
    closeCompletion,
    moveCompletionSelection,
    startCompletion,
    deleteBracketPair } from "@codemirror/autocomplete"
import {
    insertNewlineAndIndent,
    cursorCharLeft,
    selectCharLeft,
    deleteLine,
    moveLineDown,
    moveLineUp,
    copyLineDown,
    copyLineUp,
    selectLine,
    cursorMatchingBracket,
    indentMore,
    indentLess,
    cursorLineBoundaryBackward,
    selectLineBoundaryBackward,
    cursorDocStart,
    selectDocStart,
    cursorLineBoundaryForward,
    selectLineBoundaryForward,
    cursorDocEnd,
    selectDocEnd,
    cursorGroupLeft,
    selectGroupLeft,
    cursorPageDown,
    cursorPageUp,
    deleteCharBackward,
    deleteCharForward,
    deleteGroupBackward,
    deleteGroupForward,
    deleteToLineEnd,
    deleteToLineStart,
    selectAll,
    selectPageDown,
    selectPageUp,
    cursorCharRight,
    cursorGroupRight,
    selectCharRight,
    selectGroupRight,
    cursorLineUp,
    selectLineUp,
    cursorLineDown,
    selectLineDown,
    cursorLineEnd,
    cursorLineStart,
    selectLineEnd,
    selectLineStart,
    splitLine,
    transposeChars,
    toggleComment,
    lineComment,
    lineUncomment,
    toggleBlockComment,
    redo, undo, undoSelection } from "@codemirror/commands"
import { foldCode, unfoldCode, foldAll, unfoldAll } from "@codemirror/language"
import {
    closeSearchPanel,
    gotoLine,
    openSearchPanel,
    replaceAll,
    selectMatches,
    selectNextOccurrence,
    selectSelectionMatches,
} from "@codemirror/search"
import { KeyBinding } from "@codemirror/view"

import { indent } from "./indent"
import { addCursorAtEachSelectionLine, addCursorDown, addCursorUp } from "./multiCursor"

const keys: readonly KeyBinding[] = [
    { key: "Ctrl-Space", run: startCompletion },
    { key: "Escape", run: closeCompletion },
    { key: "ArrowDown", run: moveCompletionSelection(true) },
    { key: "ArrowUp", run: moveCompletionSelection(false) },
    { key: "PageDown", run: moveCompletionSelection(true, "page") },
    { key: "PageUp", run: moveCompletionSelection(false, "page") },
    { key: "Enter", run: acceptCompletion },
    { key: "Tab", run: acceptCompletion },

    { key: "Mod-f", run: openSearchPanel, scope: "editor search-panel" },
    { key: "Escape", run: closeSearchPanel, scope: "editor search-panel" },
    { key: "Alt-Enter", run: selectMatches, scope: "editor search-panel" },
    { key: "Mod-Alt-Enter", run: replaceAll, scope: "editor search-panel" },
    { key: "Ctrl-g", run: gotoLine },
    { key: "Mod-d", run: selectNextOccurrence, preventDefault: true },
    { key: "Shift-Mod-l", run: selectSelectionMatches },
    // Enter and shift enter handled within the search panel plugin

    { key: "Enter", run: insertNewlineAndIndent, shift: insertNewlineAndIndent },
    {
        key: "ArrowLeft",
        run: cursorCharLeft,
        shift: selectCharLeft,
        preventDefault: true,
    },
    {
        key: "Mod-ArrowLeft",
        mac: "Alt-ArrowLeft",
        run: cursorGroupLeft,
        shift: selectGroupLeft,
    },
    {
        key: "ArrowRight",
        run: cursorCharRight,
        shift: selectCharRight,
        preventDefault: true,
    },
    {
        key: "Mod-ArrowRight",
        mac: "Alt-ArrowRight",
        run: cursorGroupRight,
        shift: selectGroupRight,
    },

    {
        key: "ArrowUp",
        run: cursorLineUp,
        shift: selectLineUp,
        preventDefault: true,
    },
    {
        key: "ArrowDown",
        run: cursorLineDown,
        shift: selectLineDown,
        preventDefault: true,
    },

    {
        key: "Home",
        run: cursorLineBoundaryBackward,
        shift: selectLineBoundaryBackward,
    },
    {
        mac: "Cmd-ArrowLeft",
        run: cursorLineBoundaryBackward,
        shift: selectLineBoundaryBackward,
    },
    { key: "Mod-Home", run: cursorDocStart, shift: selectDocStart },
    { mac: "Cmd-ArrowUp", run: cursorDocStart, shift: selectDocStart },

    { key: "PageUp", run: cursorPageUp, shift: selectPageUp },
    { mac: "Ctrl-ArrowUp", run: cursorPageUp, shift: selectPageUp },

    { key: "PageDown", run: cursorPageDown, shift: selectPageDown },
    { mac: "Ctrl-ArrowDown", run: cursorPageDown, shift: selectPageDown },

    {
        key: "End",
        run: cursorLineBoundaryForward,
        shift: selectLineBoundaryForward,
    },
    {
        mac: "Cmd-ArrowRight",
        run: cursorLineBoundaryForward,
        shift: selectLineBoundaryForward,
    },

    {
        key: "Mod-Alt-ArrowUp",
        linux: "Shift-Alt-ArrowUp",
        run: addCursorUp,
        preventDefault: true,
    },
    {
        key: "Mod-Alt-ArrowDown",
        linux: "Shift-Alt-ArrowDown",
        run: addCursorDown,
        preventDefault: true,
    },

    {
        key: "Shift-Alt-i",
        run: addCursorAtEachSelectionLine,
    },

    { key: "Mod-End", run: cursorDocEnd, shift: selectDocEnd },
    { mac: "Cmd-ArrowDown", run: cursorDocEnd, shift: selectDocEnd },

    { key: "Mod-a", run: selectAll },
    { key: "Backspace", run: deleteBracketPair },
    { key: "Backspace", run: deleteCharBackward, shift: deleteCharBackward },
    { key: "Delete", run: deleteCharForward },
    { key: "Mod-Backspace", mac: "Alt-Backspace", run: deleteGroupBackward },
    { key: "Mod-Delete", mac: "Alt-Delete", run: deleteGroupForward },
    { mac: "Mod-Backspace", run: deleteToLineStart },
    { mac: "Mod-Delete", run: deleteToLineEnd },

    {
        mac: "Ctrl-b",
        run: cursorCharLeft,
        shift: selectCharLeft,
        preventDefault: true,
    },
    { mac: "Ctrl-f", run: cursorCharRight, shift: selectCharRight },

    { mac: "Ctrl-p", run: cursorLineUp, shift: selectLineUp },
    { mac: "Ctrl-n", run: cursorLineDown, shift: selectLineDown },

    { mac: "Ctrl-a", run: cursorLineStart, shift: selectLineStart },
    { mac: "Ctrl-e", run: cursorLineEnd, shift: selectLineEnd },

    { mac: "Ctrl-d", run: deleteCharForward },
    { mac: "Ctrl-h", run: deleteCharBackward },
    { mac: "Ctrl-k", run: deleteToLineEnd },
    { mac: "Ctrl-Alt-h", run: deleteGroupBackward },

    { mac: "Ctrl-o", run: splitLine },
    { mac: "Ctrl-t", run: transposeChars },

    { mac: "Ctrl-v", run: cursorPageDown },
    { mac: "Alt-v", run: cursorPageUp },

    { key: "Shift-Mod-k", run: deleteLine },
    { key: "Alt-ArrowDown", run: moveLineDown },
    { key: "Alt-ArrowUp", run: moveLineUp },
    { win: "Shift-Alt-ArrowDown", mac: "Shift-Alt-ArrowDown", run: copyLineDown },
    { win: "Shift-Alt-ArrowUp", mac: "Shift-Alt-ArrowUp", run: copyLineUp },

    { key: "Mod-l", run: selectLine, preventDefault: true },
    { key: "Shift-Mod-\\", run: cursorMatchingBracket },

    { key: "Tab", run: indent, shift: indentLess, preventDefault: true },
    { key: "Mod-[", run: indentLess },
    { key: "Mod-]", run: indentMore },

    { key: "Ctrl-Shift-[", mac: "Cmd-Alt-[", run: foldCode },
    { key: "Ctrl-Shift-]", mac: "Cmd-Alt-]", run: unfoldCode },
    { key: "Mod-k Mod-0", run: foldAll },
    { key: "Mod-k Mod-j", run: unfoldAll },

    { key: "Mod-k Mod-c", run: lineComment },
    { key: "Mod-k Mod-u", run: lineUncomment },
    { key: "Mod-/", run: toggleComment },
    { key: "Shift-Alt-a", run: toggleBlockComment },

    { key: "Mod-z", run: undo, preventDefault: true },
    { key: "Mod-y", run: redo, preventDefault: true },
    { key: "Mod-Shift-z", run: redo, preventDefault: true },
    { key: "Mod-u", run: undoSelection, preventDefault: true },

    //{ key: "Mod-Shift-m", run: openLintPanel },
    //{ key: "F8", run: nextDiagnostic }, // Shift should go back, but previousDiagnostic is not implemented
]

export default keys
