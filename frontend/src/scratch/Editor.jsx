import { h } from "preact"
import { useEffect } from "preact/hooks"

import Monaco, { useMonaco } from "@monaco-editor/react"
import monacoTheme from "./monacoTheme.json"

export default function Editor(props) {
    const monaco = useMonaco()

    useEffect(() => {
        if (monaco) {
            monaco.editor.defineTheme("custom", monacoTheme)
            monaco.editor.setTheme("custom")
        }
    }, [monaco])

    return <Monaco
        language="c"
        theme="custom"
        loading=""
        options={{
            minimap: {
                enabled: false,
            },
            scrollBeyondLastLine: false,
            cursorBlinking: "phase",
            //cursorSmoothCaretAnimation: true,
            fontLigatures: true,
            matchBrackets: "near",
            mouseWheelZoom: true,
        }}

        {...props}
    />
}
