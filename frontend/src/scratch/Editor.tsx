import { h, Fragment } from "preact"
import { useEffect, useState, useRef } from "preact/hooks"
import Skeleton from "react-loading-skeleton"
import MonacoEditor, { useMonaco } from "@monaco-editor/react"
import type { editor } from "monaco-editor"

import monacoTheme from "./monacoTheme"
import { language } from "./c"
import styles from "./Editor.module.css"

export default function Editor({ forceLoading, value, valueVersion, onChange, padding }) {
    const [isLoading, setIsLoading] = useState(true)
    const monaco = useMonaco()
    const [model, setModel] = useState<editor.ITextModel>()

    useEffect(() => {
        if (monaco) {
            monaco.editor.defineTheme("custom", monacoTheme)

            monaco.languages.register({ id: "custom_c" })
            monaco.languages.setMonarchTokensProvider("custom_c", language)

            setTimeout(() => setIsLoading(false), 0)
        }
    }, [monaco])

    useEffect(() => {
        if (model && value) {
            model.setValue(value)
        }
    }, [valueVersion, model])

    return <>
        <div style={{ display: (isLoading || forceLoading) ? 'none' : 'block' }} class={styles.monacoContainer}>
            <MonacoEditor
                language="custom_c"
                theme="custom"
                options={{
                    minimap: {
                        enabled: false,
                    },
                    scrollBeyondLastLine: false,
                    cursorBlinking: "phase",
                    matchBrackets: "near",
                    mouseWheelZoom: true,
                    padding: padding ? { top: 30, bottom: 30 } : {},
                    fontSize: 13,
                }}
                onMount={(editor, monaco) => {
                    setModel(editor.getModel())
                }}
                onChange={(newValue: string) => {
                    if (onChange) {
                        onChange(newValue)
                    }
                }}
            />
        </div>

        <div style={{
            display: (isLoading || forceLoading) ? 'block' : 'none',
            paddingTop: padding ? '2em' : '0',
            paddingBottom: padding ? '2em' : '0',
            paddingLeft: '2em',
            paddingRight: '2em',
            background: '#14161a',
            height: '100%',
        }}>
            <Skeleton count={6} height={22} />
        </div>
    </>
}
