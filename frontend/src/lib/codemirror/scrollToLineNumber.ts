import type { RefObject } from "react";

import type { EditorView } from "@codemirror/view";

type Options = {
    select?: boolean;
};

export function scrollToLineNumber(
    editorView: RefObject<EditorView>,
    lineNumber: number,
    options: Options = {},
) {
    const view = editorView.current;
    if (!view) return;
    if (lineNumber <= view.state.doc.lines) {
        // Source line numbers can be out of range when pragmas force line info.
        const line = view.state.doc.line(lineNumber);
        const { top } = view.lineBlockAt(line.to);
        view.scrollDOM.scrollTo({ top, behavior: "smooth" });

        if (options.select) {
            view.dispatch({
                selection: { anchor: line.from },
                scrollIntoView: true,
            });
            view.focus();
        }
    }
}
