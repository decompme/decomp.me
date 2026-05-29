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

const escapeRegex = (text: string): string =>
    text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function buildSearchRegex(query: string): RegExp | null {
    const trimmed = query.trim();
    if (!trimmed) return null;

    const pattern = trimmed
        .split(/[ \t]+/)
        .map(escapeRegex)
        .join("[ \\t]+");

    return new RegExp(pattern, "gi");
}

export function findDiffSearchMatches(
    rows: SearchableDiffRow[],
    query: string,
    maxMatches = Number.POSITIVE_INFINITY,
): DiffSearchResult {
    const regex = buildSearchRegex(query);
    if (!regex) return { matches: [], capped: false };

    const matches: DiffSearchMatch[] = [];
    for (const [rowIndex, row] of rows.entries()) {
        if (row.isPlaceholder) continue;

        for (const [columnIndex, cell] of row.cells.entries()) {
            const haystack = cellText(cell);
            regex.lastIndex = 0;

            for (const match of haystack.matchAll(regex)) {
                if (matches.length >= maxMatches) {
                    return { matches, capped: true };
                }

                const start = match.index;
                matches.push({
                    rowIndex,
                    columnIndex,
                    start,
                    end: start + match[0].length,
                });
            }
        }
    }

    return { matches, capped: false };
}
