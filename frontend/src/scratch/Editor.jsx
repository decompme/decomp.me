import { h, Fragment } from "preact"
import { useEffect, useState } from "preact/hooks"
import Skeleton from "react-loading-skeleton"
import Monaco, { useMonaco } from "@monaco-editor/react"

import monacoTheme from "./monacoTheme.json"
import { language } from "./c.js"
import styles from "./Editor.module.css"

export default function Editor({ forceLoading, value, onChange, padding }) {
    const [loadedMonaco, setLoaded] = useState(false)
    const loaded = loadedMonaco && !forceLoading
    const monaco = useMonaco()

    useEffect(() => {
        if (monaco) {
            monaco.editor.defineTheme("custom", monacoTheme)
            monaco.editor.setTheme("custom")

            monaco.languages.register({ id: "custom_c" })
            monaco.languages.setMonarchTokensProvider("custom_c", language)

            setTimeout(() => setLoaded(true), 0)
        }
    }, [monaco])

    return <>
        <div style={{ display: loaded ? 'block' : 'none' }} class={styles.monacoContainer}>
            <Monaco
                language="custom_c"
                theme="custom"
                loading=""
                options={{
                    minimap: {
                        enabled: false,
                    },
                    scrollBeyondLastLine: false,
                    cursorBlinking: "phase",
                    matchBrackets: "near",
                    mouseWheelZoom: true,
                    wordWrap: "on",
                    padding: padding ? { top: 30, bottom: 30 } : {},
                }}
                defaultValue={value}
                onChange={onChange}
            />
        </div>

        <div style={{
            display: loaded ? 'none' : 'block',
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
