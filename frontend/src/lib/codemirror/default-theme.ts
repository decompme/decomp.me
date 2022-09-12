import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { Extension } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { tags } from "@lezer/highlight"

const ivory = "#abb2bf",
    darkBackground = "#21252b",
    highlightBackground = "var(--a50)",
    background = "var(--g100)",
    tooltipBackground = "#353a42",
    selection = "var(--a100)",
    cursor = "var(--g2000)"

// TODO move to css
export const materialPalenightTheme = EditorView.theme(
    {
        "&": {
            color: "#ffffff",
            backgroundColor: background,
        },

        ".cm-content": {
            caretColor: cursor,
        },

        "&.cm-focused .cm-cursor": {
            borderLeftColor: cursor,
        },

        "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      { backgroundColor: selection },

        ".cm-panels": { backgroundColor: darkBackground, color: "#ffffff" },
        ".cm-panels.cm-panels-top": { borderBottom: "2px solid black" },
        ".cm-panels.cm-panels-bottom": { borderTop: "2px solid black" },

        ".cm-searchMatch": {
            backgroundColor: "#72a1ff59",
            outline: "1px solid #457dff",
            borderRadius: "2px",
        },
        ".cm-searchMatch.cm-searchMatch-selected": {
            backgroundColor: "#6199ff2f",
        },

        ".cm-activeLine": { backgroundColor: highlightBackground },
        ".cm-selectionMatch": { backgroundColor: "#ffffff1a", borderRadius: "2px" },

        "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
            backgroundColor: "#bad0f847",
            outline: "1px solid #515a6b",
        },

        ".cm-gutters": {
            background: background,
            color: "#676e95",
            border: "none",
        },

        ".cm-activeLineGutter": {
            color: "#c6c6c6",
            backgroundColor: highlightBackground,
        },

        ".cm-foldPlaceholder": {
            backgroundColor: "transparent",
            border: "none",
            color: "#ddd",
        },

        ".cm-tooltip": {
            border: "none",
            backgroundColor: tooltipBackground,
        },
        ".cm-tooltip .cm-tooltip-arrow:before": {
            borderTopColor: "transparent",
            borderBottomColor: "transparent",
        },
        ".cm-tooltip .cm-tooltip-arrow:after": {
            borderTopColor: tooltipBackground,
            borderBottomColor: tooltipBackground,
        },
        ".cm-tooltip-autocomplete": {
            "& > ul > li[aria-selected]": {
                backgroundColor: highlightBackground,
                color: ivory,
            },
        },
    },
    { dark: true }
)

// https://github.com/codemirror/highlight/blob/main/src/highlight.ts#L549
// https://github.com/codemirror/lang-cpp/blob/main/src/cpp.ts#L24
export const highlightStyle = HighlightStyle.define([
    { tag: tags.link, class: "cmt-link" },
    { tag: tags.heading, class: "cmt-heading" },
    { tag: tags.emphasis, class: "cmt-emphasis" },
    { tag: tags.strong, class: "cmt-strong" },
    { tag: tags.keyword, class: "cmt-keyword" },
    { tag: tags.atom, class: "cmt-atom" },
    { tag: tags.bool, class: "cmt-bool" },
    { tag: tags.url, class: "cmt-url" },
    { tag: tags.labelName, class: "cmt-labelName" },
    { tag: tags.inserted, class: "cmt-inserted" },
    { tag: tags.deleted, class: "cmt-deleted" },
    { tag: tags.literal, class: "cmt-literal" },
    { tag: tags.string, class: "cmt-string" },
    { tag: tags.character, class: "cmt-character" },
    { tag: tags.number, class: "cmt-number" },
    { tag: [tags.regexp, tags.escape, tags.special(tags.string)], class: "cmt-string2" },
    { tag: tags.variableName, class: "cmt-variableName" },
    { tag: tags.local(tags.variableName), class: "cmt-variableName cmt-local" },
    { tag: tags.definition(tags.variableName), class: "cmt-variableName cmt-definition" },
    { tag: tags.special(tags.variableName), class: "cmt-variableName2" },
    { tag: tags.definition(tags.propertyName), class: "cmt-propertyName cmt-definition" },
    { tag: tags.function(tags.variableName), class: "cmt-variableName cmt-function" },
    { tag: tags.name, class: "cmt-name" },
    { tag: tags.typeName, class: "cmt-typeName" },
    { tag: tags.namespace, class: "cmt-namespace" },
    { tag: tags.className, class: "cmt-className" },
    { tag: tags.macroName, class: "cmt-macroName" },
    { tag: tags.propertyName, class: "cmt-propertyName" },
    { tag: tags.operator, class: "cmt-operator" },
    { tag: tags.comment, class: "cmt-comment" },
    { tag: tags.meta, class: "cmt-meta" },
    { tag: tags.invalid, class: "cmt-invalid" },
    { tag: tags.punctuation, class: "cmt-punctuation" },
])

/// Extension to enable the Material Palenight theme (both the editor theme and
/// the highlight style).
export const materialPalenight: Extension = [
    materialPalenightTheme,
    syntaxHighlighting(highlightStyle),
]

export default materialPalenight
