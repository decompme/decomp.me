import { useState, useRef, useLayoutEffect, Dispatch } from "react"
import useResizeObserver from "@react-hook/resize-observer"

export function useLocalStorage<S>(key: string, initialValue: S = undefined): [S, Dispatch<S>] {
    const [storedValue, setStoredValue] = useState(() => {
        const item = localStorage.getItem(key)
        return item ? JSON.parse(item) : initialValue
    })

    const setValue = (value: S) => {
        const valueToStore = value instanceof Function ? value(storedValue) : value
        setStoredValue(valueToStore)
        localStorage.setItem(key, JSON.stringify(valueToStore))
    }

    return [storedValue, setValue]
}

export function useSize<T extends HTMLElement>() {
    const ref = useRef<T>()
    const [size, setSize] = useState({ width: 0, height: 0 })

    useLayoutEffect(() => {
        setSize(ref.current.getBoundingClientRect())
    }, [ref])

    useResizeObserver(ref, entry => setSize(entry.contentRect))

    return { width: size.width, height: size.height, ref }
}
