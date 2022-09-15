import { RefObject, useEffect, useState } from "react"

import { Compartment, Extension, Facet, Text } from "@codemirror/state"
import { EditorView, gutter, GutterMarker } from "@codemirror/view"
import { diffLines } from "diff"

import styles from "./useCompareExtension.module.scss"

function compareNullableText(a: Text | null, b: Text | null): boolean {
    if (a === null || b === null) {
        return a === b
    } else {
        return a.eq(b)
    }
}

// State for target text to diff doc against
const targetString = Facet.define<string, string | null>({
    combine: values => (values.length ? values[0] : null),
})
const targetText = Facet.define<Text, Text | null>({
    combine: values => (values.length ? values[0] : null),
    compare: compareNullableText,
    compareInput: compareNullableText,
})
const targetTextComputer = targetText.compute([targetString], state => {
    const s = state.facet(targetString)
    if (typeof s === "string")
        return Text.of(s.split("\n"))
    return null
})

// Computed diff between doc and target
type DiffLineMap = Record<number, GutterMarker>
const diffLineMap = Facet.define<DiffLineMap, DiffLineMap>({
    combine: values => (values.length ? values[0] : {}),
})
const diffLineMapComputer = diffLineMap.compute(["doc", targetString], state => {
    const s = state.facet(targetString)

    if (typeof s !== "string")
        return {}

    const changes = diffLines(s, state.doc.toString(), {
        ignoreWhitespace: true,
    })

    // Convert diff changes to a map of line numbers -> change type
    const map: DiffLineMap = {}
    let lineNumber = 1

    for (const { count: numLines, added, removed } of changes) {
        // We don't care about removed lines, since we don't show them
        if (removed) {
            continue
        }

        if (added) {
            for (let i = 0; i < numLines; i++) {
                map[lineNumber + i] = marker
            }
        }

        if (!removed) {
            lineNumber += numLines
        }
    }

    return map
})

const marker = new class extends GutterMarker {
    toDOM() {
        const span = document.createElement("span")
        span.className = styles.marker
        return span
    }
}

const diffGutter = gutter({
    lineMarker(view, block) { // Might be better to use markers field instead, but this works
        try {
            const map = view.state.facet(diffLineMap)
            const line = view.state.doc.lineAt(block.from)

            if (view.state.doc.sliceString(line.from, line.to).trim() === "") {
                // Don't show for empty/whitespace-only lines
            }

            return map[line.number]
        } catch (error) {
            if (error instanceof RangeError) {
                // Ignore
            } else {
                throw error
            }
        }
    },
    lineMarkerChange(update) {
        return update.docChanged || !compareNullableText(update.state.facet(targetText), update.startState.facet(targetText))
    },
    initialSpacer: () => marker,
})

// Extension that highlights lines in the doc that differ from `compareTo`.
export default function useCompareExtension(viewRef: RefObject<EditorView>, compareTo: string): Extension {
    const [compartment] = useState(new Compartment())

    // Update targetString facet when compareTo changes
    useEffect(() => {
        if (viewRef.current) {
            viewRef.current.dispatch({
                effects: compartment.reconfigure(targetString.of(compareTo)),
            })
        }
    }, [compartment, compareTo, viewRef])

    return [
        targetTextComputer,
        diffLineMapComputer,
        diffGutter,
        compartment.of(targetString.of(compareTo)),
    ]
}
