import { h, Fragment } from "preact"
import { useEffect, useState } from "preact/hooks"
import Skeleton from "react-loading-skeleton"
import { useMonacoEditor } from "use-monaco"

import monacoTheme from "./monacoTheme"
import { language } from "./c"
import styles from "./Editor.module.css"

export default function Editor({ forceLoading, value, valueVersion, onChange, padding }) {
    const [isLoading, setIsLoading] = useState(true)
    const { containerRef, model } = useMonacoEditor({
        options: {
            minimap: {
                enabled: false,
            },
            scrollBeyondLastLine: false,
            cursorBlinking: "phase",
            matchBrackets: "near",
            mouseWheelZoom: true,
            padding: padding ? { top: 30, bottom: 30 } : {},
            fontSize: 13,
        },

        language: "custom_c",
        theme: "custom",

        onLoad(monaco) {
            monaco.editor.defineTheme("custom", monacoTheme as any)

            monaco.languages.register({ id: "custom_c" })
            monaco.languages.setMonarchTokensProvider("custom_c", language as any)

            setIsLoading(false)
        },

        onChange(newValue: string) {
            onChange(newValue)
        },
    })

    useEffect(() => {
        if (model) {
            model.setValue(value)
        }
    }, [valueVersion, model])

    return <>
        <div ref={containerRef} style={{ display: (isLoading || forceLoading) ? 'none' : 'block' }} class={styles.monacoContainer} />

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
