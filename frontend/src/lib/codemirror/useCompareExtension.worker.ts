import { diff } from "fast-myers-diff"

export function calculateDiff(target: string | undefined, current: string): [number, number, number, number][] {
    if (typeof target !== "string") {
        return []
    }

    const tokenizeSource = source => {
        return source.split("\n").map(i => i.trim())
    }

    const diffsIterator = diff(tokenizeSource(target), tokenizeSource(current))
    return Array.from(diffsIterator)
}
