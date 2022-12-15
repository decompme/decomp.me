import { diff } from "fast-myers-diff"

declare type Vec4 = [number, number, number, number];

export function calculateDiff(target: string | undefined, current: string): Vec4[] {
    if (typeof target !== "string") {
        return []
    }

    const tokenizeSource = source => {
        return source.split("\n").map(i => i.trim())
    }

    const diffsIterator = diff(tokenizeSource(target), tokenizeSource(current))
    return Array.from(diffsIterator)
}
