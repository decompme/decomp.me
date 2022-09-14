import { Extension, Facet, Text } from "@codemirror/state"
import { gutter, GutterMarker } from "@codemirror/view"
import { diffLines } from "diff"

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
    const changes = diffLines(state.doc.toString(), state.facet(targetString), {
        ignoreWhitespace: true,
    })

    // Convert diff changes to a map of line numbers -> change type
    const map: DiffLineMap = {}
    let lineNumber = 1

    for (const { value, added, removed } of changes) {
        const numLines = value.match(/\n/g)?.length ?? 0

        if (added || removed) {
            for (let i = 0; i < numLines; i++) {
                map[lineNumber + i] = added ? addedMarker : removedMarker
            }
        }

        if (!removed) {
            lineNumber += numLines
        }
    }

    return map
})

const addedMarker = new class extends GutterMarker {
    toDOM() {
        const span = document.createElement("span")
        span.textContent = "+"
        span.style.color = "green"
        return span
    }
}

const removedMarker = new class extends GutterMarker {
    toDOM() {
        const span = document.createElement("span")
        span.textContent = "-"
        span.style.color = "red"
        return span
    }
}

const diffGutter = gutter({
    lineMarker(view, block) {
        try {
            const targetText_ = view.state.facet(targetText)
            const currentText = view.state.doc
            const map = view.state.facet(diffLineMap)

            const currentLine = currentText.lineAt(block.from)
            const targetLine = targetText_.line(currentLine.number)

            return map[targetLine.number]
        } catch (error) {
            if (error instanceof RangeError) {
                // Ignore
            } else {
                throw error
            }
        }
    },
    initialSpacer: () => addedMarker,
})

const diffGutterExtension: Extension = [
    targetTextComputer,
    diffLineMapComputer,
    diffGutter,
]

export const target = targetString

export default diffGutterExtension
