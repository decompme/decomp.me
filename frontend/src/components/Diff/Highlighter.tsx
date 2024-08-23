import { useState, useMemo } from "react"

export type Highlighter = {
    value: string | null
    setValue: (value: string | null) => void
    select: (value: string) => void
}

export type HighlighterContextData = {
    highlighters: Highlighter[]
    setHighlightAll: Highlighter["setValue"]
}

export function useHighlighers(count: number): HighlighterContextData {
    const [values, setValues] = useState<string[]>(Array(count).fill(null))
    if (values.length !== count) {
        throw new Error("Count changed")
    }
    return useMemo(() => {
        const highlighters: Highlighter[] = []
        const setHighlightAll = (value: string | null) => {
            setValues(Array(count).fill(value))
        }
        for (let i = 0; i < count; i++) {
            const setValue = (newValue: string | null) => {
                setValues(values => {
                    const newValues = [...values]
                    newValues[i] = newValue
                    return newValues
                })
            }
            highlighters.push({
                value: values[i],
                setValue: setValue,
                select: (newValue: string) => {
                    // When selecting the same value twice (double-clicking), select it
                    // in all diff columns
                    if (values[i] === newValue) {
                        setHighlightAll(newValue)
                    } else {
                        setValue(newValue)
                    }
                },
            })
        }
        return { highlighters, setHighlightAll }
    }, [count, values])
}
