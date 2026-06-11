import { SearchQuery } from "@codemirror/search";
import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";

import { countSearchMatches } from "./search-count";

function stateWithSelection(doc: string, from = 0, to = from): EditorState {
    return EditorState.create({
        doc,
        selection: { anchor: from, head: to },
    });
}

describe("countSearchMatches", () => {
    it("counts all query matches and identifies the active selected match", () => {
        const state = stateWithSelection("hit miss hit", 9, 12);
        const query = new SearchQuery({ search: "hit" });

        expect(countSearchMatches(state, query)).toEqual({
            current: 2,
            total: 2,
            capped: false,
        });
    });

    it("reports no active match when the selection is not on a match", () => {
        const state = stateWithSelection("hit miss hit", 4);
        const query = new SearchQuery({ search: "hit" });

        expect(countSearchMatches(state, query)).toEqual({
            current: 0,
            total: 2,
            capped: false,
        });
    });

    it("uses CodeMirror query options when counting matches", () => {
        const state = stateWithSelection("Hit hit hat", 4, 7);

        expect(
            countSearchMatches(
                state,
                new SearchQuery({ search: "hit", caseSensitive: true }),
            ),
        ).toEqual({
            current: 1,
            total: 1,
            capped: false,
        });
        expect(
            countSearchMatches(
                state,
                new SearchQuery({ search: "h.t", regexp: true }),
            ),
        ).toEqual({
            current: 2,
            total: 3,
            capped: false,
        });
    });

    it("returns zero counts for invalid or empty queries", () => {
        const state = stateWithSelection("hit miss hit");

        expect(
            countSearchMatches(state, new SearchQuery({ search: "" })),
        ).toEqual({
            current: 0,
            total: 0,
            capped: false,
        });
        expect(
            countSearchMatches(
                state,
                new SearchQuery({ search: "[", regexp: true }),
            ),
        ).toEqual({
            current: 0,
            total: 0,
            capped: false,
        });
    });

    it("caps match counting after 1000 results", () => {
        const state = stateWithSelection(
            `${"x".repeat(1001)} selected`,
            1001,
            1009,
        );
        const query = new SearchQuery({ search: ".", regexp: true });

        expect(countSearchMatches(state, query)).toEqual({
            current: 0,
            total: 1000,
            capped: true,
        });
    });
});
