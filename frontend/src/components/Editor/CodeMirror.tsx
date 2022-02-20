import { MutableRefObject, useEffect, useRef } from "react"

import { Extension, EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

export interface Props {
    value: string
    onChange?: (value: string) => void
    className?: string
    viewRef?: MutableRefObject<EditorView | null>
    extensions: Extension // const
}

export default function CodeMirror({ value, onChange, className, viewRef: viewRefProp, extensions }: Props) {
    const el = useRef<HTMLDivElement>()

    const valueRef = useRef(value)
    valueRef.current = value

    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange

    const viewRef = useRef<EditorView>()

    const extensionsRef = useRef(extensions)
    extensionsRef.current = extensions

    // Initial view creation
    useEffect(() => {
        viewRef.current = new EditorView({
            state: EditorState.create({
                doc: valueRef.current,
                extensions: [
                    EditorState.transactionExtender.of(({ newDoc }) => {
                        const newValue = newDoc.toString()
                        if (newValue !== valueRef.current) {
                            onChangeRef.current?.(newValue)
                        }
                        return null
                    }),
                    extensionsRef.current,
                ],
            }),
            parent: el.current,
        })

        if (viewRefProp)
            viewRefProp.current = viewRef.current

        return () => {
            viewRef.current.destroy()
            viewRef.current = null
            if (viewRefProp)
                viewRefProp.current = null
        }
    }, [viewRefProp])

    // Replace doc when `value` prop changes
    useEffect(() => {
        const view = viewRef.current
        if (view) {
            const prevValue = view.state.doc.toString()

            if (prevValue != value) {
                view.dispatch(
                    view.state.update({
                        changes: {
                            from: 0,
                            to: prevValue.length,
                            insert: value,
                        },
                    })
                )
            }
        }
    }, [value])

    return <div ref={el} className={className} />
}
