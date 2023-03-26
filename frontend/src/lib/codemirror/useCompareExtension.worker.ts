import { diff } from "fast-myers-diff"

const ctx: Worker = self as any

ctx.onmessage = ({ data }: {data: DiffRequest}) => {
    if (typeof data.target !== "string") {
        return []
    }

    const tokenizeSource = source => {
        return source.split("\n").map(i => i.trim())
    }

    const diffsIterator = diff(tokenizeSource(data.target), tokenizeSource(data.current))
    ctx.postMessage(Array.from(diffsIterator))
}

export type DiffRequest = {target: string | undefined, current: string };
