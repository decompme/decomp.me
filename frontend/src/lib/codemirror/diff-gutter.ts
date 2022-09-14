import { Extension, Facet, Text } from "@codemirror/state"
import { gutter, GutterMarker } from "@codemirror/view"
import { diffLines } from "diff"

import styles from "./diff-gutter.module.scss"

// State for target text to diff doc against
const targetString = Facet.define<string, string>({
    combine: values => (values.length ? values[0] : ""),
})
const targetText = Facet.define<Text, Text>({
    combine: values => (values.length ? values[0] : Text.empty),
    compare: (a, b) => a.eq(b),
    compareInput: (a, b) => a.eq(b),
})
const targetTextComputer = targetText.compute([targetString], state => {
    return Text.of(state.facet(targetString).split("\n"))
})

// Computed diff between doc and target
type DiffLineMap = Record<number, GutterMarker>
const diffLineMap = Facet.define<DiffLineMap, DiffLineMap>({
    combine: values => (values.length ? values[0] : {}),
})
const diffLineMapComputer = diffLineMap.compute(["doc", targetString], state => {
    const changes = diffLines(state.facet(targetString), state.doc.toString(), {
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

    console.log(map)

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
        return update.docChanged || !update.state.facet(targetText).eq(update.startState.facet(targetText))
    },
    initialSpacer: () => marker,
})

const diffGutterExtension: Extension = [
    targetTextComputer,
    diffLineMapComputer,
    diffGutter,
]

export const target = targetString

export default diffGutterExtension
