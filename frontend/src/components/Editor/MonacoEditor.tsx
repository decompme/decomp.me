import { useEffect, useState, useRef, MutableRefObject } from "react"

import classNames from "classnames"
import { editor, languages } from "monaco-editor"

import * as c from "./language/c"
import * as mips from "./language/mips"
import styles from "./MonacoEditor.module.scss"
import monacoTheme from "./monacoTheme"

import "monaco-editor/min/vs/editor/editor.main.css"

if (typeof window === "undefined") {
    throw new Error("Editor component does not work with SSR, use next/dynamic with { ssr: false }")
}

languages.register({ id: "decompme_c" })
languages.setLanguageConfiguration("decompme_c", c.conf)
languages.setMonarchTokensProvider("decompme_c", c.language)

languages.register({ id: "decompme_mips" })
languages.setLanguageConfiguration("decompme_mips", mips.conf)
languages.setMonarchTokensProvider("decompme_mips", mips.language)

function convertLanguage(language: string) {
    if (language === "c")
        return "decompme_c"
    else if (language === "mips")
        return "decompme_mips"
    else
        return "plaintext"
}

export type EditorInstance = editor.IStandaloneCodeEditor;

export type Props = {
    className?: string

    // This is a controlled component
    value: string
    onChange?: (value: string) => void

    instanceRef?: MutableRefObject<editor.IStandaloneCodeEditor>

    // Options
    language: "c" | "mips"
    lineNumbers?: boolean
    showMargin?: boolean
    padding?: number // css
}

export default function Editor({ value, onChange, className, showMargin, padding, language, lineNumbers, instanceRef }: Props) {
    const isReadOnly = typeof onChange === "undefined"
    const containerRef = useRef<HTMLDivElement>(null)
    const [editorInstance, setEditorInstance] = useState<editor.IStandaloneCodeEditor | null>(null)

    // Effect to set up the editor. This is run once when the component is mounted.
    useEffect(() => {
        editor.defineTheme("custom", monacoTheme())

        const editorInstance = editor.create(containerRef.current, {
            language: convertLanguage(language),
            value,
            theme: "custom",
            autoDetectHighContrast: false,
            minimap: {
                enabled: false,
            },
            lineNumbers: lineNumbers ? "on" : "off",
            renderLineHighlightOnlyWhenFocus: true,
            scrollBeyondLastLine: false,
            scrollbar: {
                alwaysConsumeMouseWheel: false,
            },
            contextmenu: true,
            //fontLigatures: true,
            //fontFamily: "Jetbrains Mono",
            readOnly: isReadOnly,
            domReadOnly: isReadOnly,
            occurrencesHighlight: !isReadOnly,
            renderLineHighlight: isReadOnly ? "none" : "all",
            padding: {
                top: padding ?? (showMargin ? 20 : 0), // to match gutter
                bottom: padding ?? 0,
            },
            glyphMargin: !!showMargin,
            folding: !!showMargin,
            lineDecorationsWidth: padding ?? (showMargin ? 10 : 0),
            lineNumbersMinChars: showMargin ? 2 : 0,
            automaticLayout: true,
        })
        setEditorInstance(editorInstance)
        if (instanceRef)
            instanceRef.current = editorInstance

        const model = editorInstance.getModel()
        if (model) {
            model.onDidChangeContent(() => {
                if (onChange)
                    onChange(model.getValue())
            })
        } else {
            console.error("monaco editor has no model")
        }

        return () => editorInstance.dispose()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Update value.
    useEffect(() => {
        const model = editorInstance?.getModel()

        // Only update the model value if it is different; otherwise, the
        // model state will be reset every time the user types!
        if (model && model.getValue() !== value) {
            console.warn("editor value reset")
            model.setValue(value)
        }
    }, [editorInstance, value])

    // Update language.
    useEffect(() => {
        const model = editorInstance?.getModel()

        if (model) {
            editor.setModelLanguage(model, convertLanguage(language))
        }
    }, [editorInstance, language])

    useEffect(() => {
        editorInstance?.updateOptions({ lineNumbers: lineNumbers ? "on" : "off" })
    }, [editorInstance, lineNumbers])

    useEffect(() => {
        editorInstance?.updateOptions({
            glyphMargin: !!showMargin,
            folding: !!showMargin,
            lineDecorationsWidth: padding ?? (showMargin ? 10 : 0),
            lineNumbersMinChars: showMargin ? 2 : 0,
        })
    }, [editorInstance, padding, showMargin])

    return <div
        ref={containerRef}
        className={classNames(
            styles.container,
            className,
            {
                [styles.readonly]: isReadOnly,
            },
        )}
        onKeyDownCapture={e => {
            if (isReadOnly) {
                // disable changing lines with arrow keys
                if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
                    e.stopPropagation()
                }

                // disable command palette
                if (e.key === "F1") {
                    e.preventDefault()
                    e.stopPropagation()
                }
            } else {
                // Command Palette
                if ((e.ctrlKey || e.metaKey) && e.key === "p") {
                    e.preventDefault()
                    e.stopPropagation()

                    if (e.shiftKey)
                        editorInstance?.trigger("", "editor.action.quickCommand", "")
                    //console.log(editor.getSupportedActions())
                }
            }
        }}
    />
}
