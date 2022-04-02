import { CSSProperties, MutableRefObject, useEffect, useRef } from "react"

import { Extension, EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { useDebouncedCallback } from "use-debounce"

import { materialPalenight } from "../../lib/themes/dark"

export interface Props {
    value: string
    onChange?: (value: string) => void
    onHoveredLineChange?: (value: number | null) => void
    onSelectedLineChange?: (value: number) => void
    className?: string
    viewRef?: MutableRefObject<EditorView | null>
    extensions: Extension // const
    fontSize?: number
}

export default function CodeMirror({
    value,
    onChange,
    onHoveredLineChange,
    onSelectedLineChange,
    className,
    viewRef: viewRefProp,
    extensions,
    fontSize,
}: Props) {
    const el = useRef<HTMLDivElement>()

    const valueRef = useRef(value)
    valueRef.current = value

    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange

    const viewRef = useRef<EditorView>()

    const extensionsRef = useRef(extensions)
    extensionsRef.current = extensions

    const selectedLineRef = useRef<number>()
    const hoveredLineRef = useRef<number>()

    const onHoveredLineChangeRef = useRef(onHoveredLineChange)
    onHoveredLineChangeRef.current = onHoveredLineChange

    const onSelectedLineChangeRef = useRef(onSelectedLineChange)
    onSelectedLineChangeRef.current = onSelectedLineChange

    // Initial view creation
    useEffect(() => {
        viewRef.current = new EditorView({
            state: EditorState.create({
                doc: valueRef.current,
                extensions: [
                    EditorState.transactionExtender.of(({ newDoc, newSelection }) => {
                        // value / onChange
                        const newValue = newDoc.toString()
                        if (newValue !== valueRef.current) {
                            onChangeRef.current?.(newValue)
                        }

                        // selectedSourceLine
                        const line = newDoc.lineAt(newSelection.main.from).number
                        if (hoveredLineRef.current !== line) {
                            hoveredLineRef.current = line
                            requestAnimationFrame(() => {
                                onSelectedLineChangeRef.current?.(line)
                            })
                        }

                        return null
                    }),
                    extensionsRef.current,
                    materialPalenight,
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

    const debouncedOnMouseMove = useDebouncedCallback(
        event => {
            if (!onHoveredLineChangeRef.current)
                return

            const view = viewRef.current
            let newLine: number | null = null
            if (view) {
                const line = view.state.doc.lineAt(view.posAtCoords({ x: event.clientX, y: event.clientY })).number
                if (line) {
                    newLine = line
                }
            }

            if (selectedLineRef.current != newLine) {
                selectedLineRef.current = newLine
                onHoveredLineChangeRef.current?.(newLine)
            }
        },
        100,
        { leading: true, trailing: true },
    )

    return <div
        ref={el}
        onMouseMove={debouncedOnMouseMove}
        className={className}
        style={typeof fontSize == "number" ? { "--cm-font-size": `${fontSize}px` } as CSSProperties : {}}
    />
}
