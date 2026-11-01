import { describe, expect, it } from "vitest";

import { isLongEnoughToSearch, MAX_SEARCH_QUERY_LENGTH } from "./search";

describe("isLongEnoughToSearch", () => {
    it("rejects queries shorter than the minimum", () => {
        expect(isLongEnoughToSearch("")).toBe(false);
        expect(isLongEnoughToSearch("a")).toBe(false);
        expect(isLongEnoughToSearch("ab")).toBe(false);
        expect(isLongEnoughToSearch(" a ")).toBe(false);
    });

    it("accepts queries at or above the minimum", () => {
        expect(isLongEnoughToSearch("abc")).toBe(true);
        expect(isLongEnoughToSearch(" abc ")).toBe(true);
        expect(isLongEnoughToSearch("a".repeat(MAX_SEARCH_QUERY_LENGTH))).toBe(
            true,
        );
    });
});
