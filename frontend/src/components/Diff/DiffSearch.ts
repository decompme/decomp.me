import type * as api from "@/lib/api";

export type DiffSearchMatch = {
    rowIndex: number;
    columnIndex: number;
    start: number;
    end: number;
};

export type DiffSearchResult = {
    matches: DiffSearchMatch[];
    capped: boolean;
};

type SearchableDiffRow = {
    cells: Array<api.DiffCell | undefined>;
    isPlaceholder?: boolean;
};

const cellText = (cell: api.DiffCell | undefined): string =>
    cell?.text.map((text) => text.text).join("") ?? "";

export function findDiffSearchMatches(
    rows: SearchableDiffRow[],
    query: string,
    maxMatches = Number.POSITIVE_INFINITY,
): DiffSearchResult {
    const needle = query.toLowerCase();
    if (!needle) return { matches: [], capped: false };

    const matches: DiffSearchMatch[] = [];
    for (const [rowIndex, row] of rows.entries()) {
        if (row.isPlaceholder) continue;

        for (const [columnIndex, cell] of row.cells.entries()) {
            const haystack = cellText(cell).toLowerCase();
            let start = haystack.indexOf(needle);
            while (start !== -1) {
                if (matches.length >= maxMatches) {
                    return { matches, capped: true };
                }

                matches.push({
                    rowIndex,
                    columnIndex,
                    start,
                    end: start + needle.length,
                });
                start = haystack.indexOf(needle, start + needle.length);
            }
        }
    }

    return { matches, capped: false };
}
