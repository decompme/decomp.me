import { diff as myersDiff } from "fast-myers-diff"

import type { DiffOutput, DiffRow } from "./api"

type Chunk = {
    unaligned: DiffRow[]
    aligned: DiffRow
}

function chunkDiffLines(rows: DiffRow[]): { chunks: Chunk[], lastUnaligned: DiffRow[] } {
    let unaligned = []
    const chunks = []
    for (const row of rows) {
        if (row.base) {
            chunks.push({ unaligned, aligned: row })
            unaligned = []
        } else {
            unaligned.push(row)
        }
    }
    return { chunks, lastUnaligned: unaligned }
}

/**
 * Combine two normal diffs into a three-way diff. This algorithm is derived from asm-differ:
 * https://github.com/simonlindholm/asm-differ/blob/3841240be5e59c63f735f3cffc5a4c8dd16f14b1/diff.py#L3413-L3447
 */
export function interdiff(curr: DiffOutput | null, prev: DiffOutput | null): DiffOutput | null {
    if (!curr || !prev)
        return curr

    const rows: DiffRow[] = []
    const addMatching = (c: DiffRow, p: DiffRow) => {
        if (c.key === p.key) {
            rows.push(c)
        } else {
            rows.push({
                key: c.key,
                base: c.base,
                current: c.current,
                previous: p.current,
            })
        }
    }

    const addUnaligned = (cs: DiffRow[], ps: DiffRow[]) => {
        if (!cs.length && !ps.length)
            return
        const ckeys = cs.map(c => c.key)
        const pkeys = ps.map(p => p.key)
        let ci = 0, pi = 0
        // Array.from to silence an error about "Type 'IterableIterator<...>'
        // can only be iterated through when using the '--downlevelIteration'
        // flag or with a '--target' of 'es2015' or higher" -- changing
        // tsconfig compilerOptions.target does not seem to work for me.
        for (const [c0, c1, p0, p1] of Array.from(myersDiff(ckeys, pkeys))) {
            if (c0 - ci !== p0 - pi) {
                throw new Error("bad myers-diff range")
            }
            while (ci != c0)
                addMatching(cs[ci++], ps[pi++])
            while (ci != c1) {
                const c = cs[ci++]
                rows.push({
                    key: c.key,
                    current: c.current,
                })
            }
            while (pi != p1) {
                const p = ps[pi++]
                rows.push({
                    key: p.key,
                    previous: p.current,
                })
            }
        }
        if (cs.length - ci !== ps.length - pi) {
            throw new Error("bad myers-diff range")
        }
        while (ci != cs.length)
            addMatching(cs[ci++], ps[pi++])
    }

    const currChunks = chunkDiffLines(curr.rows)
    const prevChunks = chunkDiffLines(prev.rows)
    if (currChunks.chunks.length !== prevChunks.chunks.length) {
        // This should logically never happen, since the two diffs are based on
        // the same target.
        console.warn("Diff base changed size between two diffs?", curr, prev)
        return curr
    }
    for (let i = 0; i < currChunks.chunks.length; i++) {
        const c = currChunks.chunks[i]
        const p = prevChunks.chunks[i]
        addUnaligned(c.unaligned, p.unaligned)
        addMatching(c.aligned, p.aligned)
    }
    addUnaligned(currChunks.lastUnaligned, prevChunks.lastUnaligned)

    return {
        arch_str: curr.arch_str,
        current_score: curr.current_score,
        max_score: curr.max_score,
        header: curr.header,
        rows: rows,
    }
    return curr
}
