import { describe, expect, it } from "vitest";

import type * as api from "@/lib/api";

import { findDiffSearchMatches } from "./DiffSearch";

const cell = (text: string): api.DiffCell => ({
    text: [{ text }],
});

describe("findDiffSearchMatches", () => {
    it("orders matches across visible columns before moving to the next row", () => {
        const rows = [
            {
                key: "row-1",
                cells: [cell("target hit"), cell("current hit"), cell("saved")],
            },
            {
                key: "row-2",
                cells: [cell("target"), cell("current"), cell("saved hit")],
            },
        ];

        expect(findDiffSearchMatches(rows, "hit")).toEqual({
            matches: [
                { rowIndex: 0, columnIndex: 0, start: 7, end: 10 },
                { rowIndex: 0, columnIndex: 1, start: 8, end: 11 },
                { rowIndex: 1, columnIndex: 2, start: 6, end: 9 },
            ],
            capped: false,
        });
    });

    it("ignores collapsed placeholder rows and matches case-insensitively", () => {
        const rows = [
            {
                key: "collapsed",
                isPlaceholder: true,
                cells: [cell("Expand 8 HIT lines")],
            },
            {
                key: "row",
                cells: [cell("Li HI"), undefined, cell("li")],
            },
        ];

        expect(findDiffSearchMatches(rows, "li")).toEqual({
            matches: [
                { rowIndex: 1, columnIndex: 0, start: 0, end: 2 },
                { rowIndex: 1, columnIndex: 2, start: 0, end: 2 },
            ],
            capped: false,
        });
    });

    it("caps collected matches", () => {
        const rows = [
            {
                key: "row",
                cells: [cell("hit hit"), cell("hit")],
            },
        ];

        expect(findDiffSearchMatches(rows, "hit", 2)).toEqual({
            matches: [
                { rowIndex: 0, columnIndex: 0, start: 0, end: 3 },
                { rowIndex: 0, columnIndex: 0, start: 4, end: 7 },
            ],
            capped: true,
        });
    });

    it("matches query whitespace against spaces or tabs in the diff", () => {
        const rows = [
            {
                key: "row",
                cells: [
                    cell("beq     v1,v0,1e0"),
                    cell("beq\tv1,v0,1e0"),
                    cell("beqv1,v0,1e0"),
                ],
            },
        ];

        expect(findDiffSearchMatches(rows, "beq v1,v0,1e0")).toEqual({
            matches: [
                { rowIndex: 0, columnIndex: 0, start: 0, end: 17 },
                { rowIndex: 0, columnIndex: 1, start: 0, end: 13 },
            ],
            capped: false,
        });
    });

    it("treats regex characters as literal search text", () => {
        const rows = [
            {
                key: "row",
                cells: [cell("lw v0,%lo(symbol)(a0)")],
            },
        ];

        expect(findDiffSearchMatches(rows, "%lo(symbol)(a0)")).toEqual({
            matches: [{ rowIndex: 0, columnIndex: 0, start: 6, end: 21 }],
            capped: false,
        });
    });
});
