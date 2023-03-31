import { RefObject, useEffect, useState } from "react"

import { Compartment, Extension, Facet } from "@codemirror/state"
import { EditorView, gutter, GutterMarker, ViewPlugin, ViewUpdate } from "@codemirror/view"

import styles from "./useCompareExtension.module.scss"
import { type DiffRequest } from "./useCompareExtension.worker"

// State for target text to diff doc against
const targetString = Facet.define<string, string | null>({
    combine: values => (values.length ? values[0] : null),
})

// Computed diff between doc and target
type DiffLineMap = Record<number, GutterMarker>
const diffLineMap = Facet.define<DiffLineMap, DiffLineMap>({
    combine: values => (values.length ? values[0] : {}),
})

const marker = new (class extends GutterMarker {
    toDOM() {
        const span = document.createElement("span")
        span.className = styles.marker
        return span
    }
})

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
        return update.docChanged || (update.state.facet(diffLineMap) != update.startState.facet(diffLineMap))
    },
    initialSpacer: () => marker,
})

const diffLineMapCompartment = new Compartment()

type DiffResult = [number, number, number, number][];

const diffLineCalcPlugin = ViewPlugin.fromClass(class {
    private worker = new Worker(new URL("./useCompareExtension.worker.ts", import.meta.url))

    constructor(private view: EditorView) {
        this.updateDiff()
    }

    async update(update: ViewUpdate) {
        if (update.docChanged) {
            this.updateDiff()
        }
    }

    async calculateDiff(targetString, currentString): Promise<DiffResult> {
        return new Promise(resolve => {
            const diffRequest: DiffRequest = { target: targetString, current: currentString }
            this.worker.postMessage(diffRequest)

            const listener = ({ data }: {data: DiffResult}) => {
                this.worker.removeEventListener("message", listener)
                resolve(data)
            }

            this.worker.addEventListener("message", listener)
        })
    }

    async updateDiff() {
        const diff = await this.calculateDiff(this.view.state.facet(targetString), this.view.state.doc.toString())

        // Convert diff changes to a map of line numbers -> change type
        let map: DiffLineMap = {}

        for (const [, , childStartLine, childEndLine] of diff) {
            for (let i = childStartLine; i < childEndLine; i++) {
                map[i + 1] = marker
            }
        }

        // Has our targetString been updated to a blank,
        // and thus we should be showing no diff right now, while
        // the view's been updating?
        if (typeof this.view.state.facet(targetString) !== "string") {
            map = {}
        }

        this.view.dispatch({
            effects: diffLineMapCompartment.reconfigure(diffLineMap.of(map)),
        })
    }
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
        diffGutter,
        compartment.of(targetString.of(compareTo)),
        diffLineMapCompartment.of(diffLineMap.of({})),
        diffLineCalcPlugin,
    ]
}
