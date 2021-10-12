import { Suspense } from "react"

import dynamic from "next/dynamic"

import classNames from "classnames"
import mobile from "is-mobile"

import LoadingSpinner from "../loading.svg"

import styles from "./Editor.module.scss"
import type { Props as MonacoEditorProps } from "./MonacoEditor"
import getTheme from "./monacoTheme"

const isMobile = mobile()

interface Props extends MonacoEditorProps {
    useLoadingSpinner?: boolean,
}

const MonacoEditor = isMobile ? null : dynamic(() => import("./MonacoEditor"), {
    suspense: true, // @ts-ignore
})

// Wrapper component that asyncronously loads MonacoEditor on desktop,
// falling back to a simple textarea on mobile
export default function Editor(props: Props) {
    const monacoTheme = getTheme()
    const style = {
        color: monacoTheme.colors["editor.foreground"],
        backgroundColor: monacoTheme.colors["editor.background"],
        padding: (props.padding ?? (props.showMargin ? 20 : 0)) + "px",
    }

    const textarea = <textarea
        className={classNames(styles.editor, props.className)}
        spellCheck={false}
        value={props.value}
        readOnly={!props.onChange}
        onChange={event => {
            const value = event.target.value
            if (props.onChange)
                props.onChange(value)
        }}
        style={style}
    />

    if (MonacoEditor) {
        const loading = props.useLoadingSpinner ? <div
            className={classNames(styles.loadingContainer, props.className)}
            style={style}
        >
            <LoadingSpinner />
        </div> : textarea

        return <Suspense fallback={loading}>
            <MonacoEditor {...props} />
        </Suspense>
    } else {
        return textarea
    }
}
