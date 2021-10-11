import { useEffect, useState } from "react"

import MonacoEditor, { useMonaco } from "@monaco-editor/react"
import classNames from "classnames"
import { editor } from "monaco-editor"
import Skeleton from "react-loading-skeleton"


import * as customLanguage from "./c"
import styles from "./Editor.module.css"
import monacoTheme from "./monacoTheme"

export type Props = {
    className?: string,
    language: "c" | "asm",
    forceLoading?: boolean,
    value?: string,
    valueVersion?: string | number,
    onChange?: (value: string) => void,
    padding?: boolean,
}

export default function Editor({ className, language, forceLoading, value, valueVersion, onChange, padding }: Props) {
    const [isLoading, setIsLoading] = useState(true)
    const monaco = useMonaco()
    const [model, setModel] = useState<editor.ITextModel>()

    useEffect(() => {
        if (monaco) {
            monaco.editor.defineTheme("custom", monacoTheme)

            if (language === "c") {
                monaco.languages.register({ id: "custom_c" })
                monaco.languages.setLanguageConfiguration("custom_c", customLanguage.conf)
                monaco.languages.setMonarchTokensProvider("custom_c", customLanguage.language)
            } else if (language === "asm") {
                // TODO
            }

            setTimeout(() => setIsLoading(false), 0)
        }
    }, [monaco])  // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (model && value) {
            console.info("Updating editor value because valueVersion changed")
            model.setValue(value)
        }
    }, [valueVersion, model]) // eslint-disable-line react-hooks/exhaustive-deps

    return <>
        <div style={{ display: (isLoading || forceLoading) ? "none" : "block" }} className={classNames(styles.monacoContainer, className)}>
            <MonacoEditor
                language={language === "c" ? "custom_c" : "custom_asm"}
                theme="custom"
                defaultValue={value}
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
                onMount={editor => {
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
            display: (isLoading || forceLoading) ? "block" : "none",
            paddingTop: padding ? "2em" : "0",
            paddingBottom: padding ? "2em" : "0",
            paddingLeft: "2em",
            paddingRight: "2em",
            background: "#14161a",
            height: "100%",
        }}>
            <Skeleton count={6} height={22} />
        </div>
    </>
}
