import { editor } from "monaco-editor"

const theme: editor.IStandaloneThemeData = {
    "base": "vs-dark",
    "inherit": false,
    "rules": [
        { "token": "", "foreground": "ff494c" },
        { "token": "identifier", "foreground": "8599B3" },
        { "token": "delimiter", "foreground": "555f6e" },
        { "token": "operator", "foreground": "7F83FF" },
        { "token": "operator.comparison", "foreground": "FF4ABA" },
        { "token": "comment", "foreground": "465173" },
        { "token": "string", "foreground": "0AFAFA" },
        { "token": "number", "foreground": "0AFAFA" },
        { "token": "function", "foreground": "FF4A98" },
        { "token": "constant.language", "foreground": "0AFAFA" },
        { "token": "constant.character, constant.other", "foreground": "0AFAFA" },
        { "token": "keyword", "foreground": "7F83FF" },
        { "token": "entity.name.class", "foreground": "FF4A98" },
        { "token": "entity.name.function", "foreground": "FF4A98" },
        { "token": "entity.other.attribute-name", "foreground": "FF4A98" },
        { "token": "support.function", "foreground": "45B8FF" },
        { "token": "storage", "foreground": "45B8FF" },
        { "token": "macro", "foreground": "3bff6c" }
    ],
    "colors": {
        "editor.foreground": "#8599b3",
        "editor.background": "#14161a",
        "editor.selectionBackground": "#ffffff22",
        "editor.lineHighlightBackground": "#ccccff07",
        "editorCursor.foreground": "#c9cbfc",
        "editorWhitespace.foreground": "#c9cbfc11",
        "editorLineNumber.foreground":"#ccccff31"
    }
}

export default theme
