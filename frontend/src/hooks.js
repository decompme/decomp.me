import { useState, useRef, useLayoutEffect } from "preact/hooks"
import useResizeObserver from "@react-hook/resize-observer"

export function useLocalStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(() => {
        const item = localStorage.getItem(key)
        return item ? JSON.parse(item) : initialValue
    })

    const setValue = value => {
        const valueToStore = value instanceof Function ? value(storedValue) : value
        setStoredValue(valueToStore)
        localStorage.setItem(key, JSON.stringify(valueToStore))
    }

    return [storedValue, setValue]
}

export function useSize() {
    const ref = useRef()
    const [size, setSize] = useState({ width: 0, height: 0 })
  
    useLayoutEffect(() => {
        setSize(ref.current.getBoundingClientRect())
    }, [ref])

    useResizeObserver(ref, entry => setSize(entry.contentRect))

    return { width: size.width, height: size.height, ref }
}
