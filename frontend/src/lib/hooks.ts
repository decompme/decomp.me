import { useState, useRef, useLayoutEffect, useEffect } from "react"

import useResizeObserver from "@react-hook/resize-observer"

export function useSize<T extends HTMLElement>() {
    const ref = useRef<T>()
    const [size, setSize] = useState({ width: 0, height: 0 })

    useLayoutEffect(() => {
        if (ref.current)
            setSize(ref.current.getBoundingClientRect())
    }, [ref])

    useResizeObserver(ref, entry => setSize(entry.contentRect))

    return { width: size.width, height: size.height, ref }
}

export function useBeforeUnload(fn: (event: BeforeUnloadEvent) => string) {
    const cb = useRef(fn)

    useEffect(() => {
        const onUnload = cb.current
        window.addEventListener("beforeunload", onUnload, { capture: true })
        return () => {
            window.removeEventListener("beforeunload", onUnload, { capture: true })
        }
    }, [cb])
}

export function useThemeVariable(variable: string): string {
    const [value, setValue] = useState<string>()

    useEffect(() => {
        const style = window.getComputedStyle(document.body)
        setValue(style.getPropertyValue(variable))
    }, [variable])

    return value
}
