import {
    getSearchQuery,
    searchPanelOpen,
    setSearchQuery,
    type SearchQuery,
} from "@codemirror/search";
import type { EditorState, SelectionRange } from "@codemirror/state";
import {
    type EditorView,
    type PluginValue,
    type ViewUpdate,
    ViewPlugin,
} from "@codemirror/view";

export type SearchMatchCount = {
    current: number;
    total: number;
    capped: boolean;
};

export const SEARCH_MATCH_COUNT_LIMIT = 1000;

function isActiveSearchMatch(
    selection: SelectionRange,
    from: number,
    to: number,
): boolean {
    return selection.from === from && selection.to === to;
}

export function countSearchMatches(
    state: EditorState,
    query: SearchQuery,
): SearchMatchCount {
    if (!query.search || !query.valid) {
        return { current: 0, total: 0, capped: false };
    }

    let current = 0;
    let total = 0;
    let capped = false;
    const selection = state.selection.main;
    const cursor = query.getCursor(state);

    while (true) {
        const match = cursor.next();
        if (match.done) break;

        total += 1;
        if (total > SEARCH_MATCH_COUNT_LIMIT) {
            total = SEARCH_MATCH_COUNT_LIMIT;
            capped = true;
            break;
        }

        if (
            current === 0 &&
            isActiveSearchMatch(selection, match.value.from, match.value.to)
        ) {
            current = total;
        }
    }

    return { current, total, capped };
}

export function getSearchMatchCount(
    state: EditorState,
    query: SearchQuery = getSearchQuery(state),
): SearchMatchCount | null {
    if (!searchPanelOpen(state)) {
        return null;
    }

    return countSearchMatches(state, query);
}

class SearchCountViewPlugin implements PluginValue {
    private readonly countElement: HTMLSpanElement;
    private isSearchPanelOpen = false;
    private animationFrameId: number | null = null;

    constructor(private readonly view: EditorView) {
        this.countElement = view.dom.ownerDocument.createElement("span");
        this.countElement.className = "cm-search-count";
        this.countElement.setAttribute("aria-live", "polite");

        this.scheduleUpdate();
    }

    update(update: ViewUpdate) {
        const panelOpen = searchPanelOpen(update.state);
        const queryChanged = update.transactions.some((transaction) =>
            transaction.effects.some((effect) => effect.is(setSearchQuery)),
        );

        if (
            panelOpen !== this.isSearchPanelOpen ||
            (panelOpen &&
                (update.docChanged || update.selectionSet || queryChanged))
        ) {
            this.scheduleUpdate();
        }
    }

    destroy() {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.countElement.remove();
    }

    private scheduleUpdate() {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
        }

        this.animationFrameId = requestAnimationFrame(() => {
            this.animationFrameId = null;
            this.updateCount();
        });
    }

    private updateCount() {
        this.isSearchPanelOpen = searchPanelOpen(this.view.state);
        const searchPanel = this.view.dom.querySelector(".cm-search");
        if (!searchPanel) {
            this.countElement.remove();
            return;
        }

        const searchField = searchPanel.querySelector("[main-field]");
        if (searchField && this.countElement.parentElement !== searchPanel) {
            searchField.insertAdjacentElement("afterend", this.countElement);
        }

        const count = getSearchMatchCount(this.view.state);
        this.countElement.textContent = count
            ? `${count.current}/${count.total}${count.capped ? "+" : ""}`
            : "";
    }
}

const searchCount = ViewPlugin.fromClass(SearchCountViewPlugin);

export default searchCount;
