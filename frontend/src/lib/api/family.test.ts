import { describe, expect, it } from "vitest";

import {
    type FamilyScratch,
    findFamilyMatch,
    getScratchStatusColor,
    isMatchedScratch,
    STATUS_COLORS,
} from "./family";

const slug = "abc123";
const scratch = (overrides: Partial<FamilyScratch> = {}): FamilyScratch => ({
    slug,
    score: 100,
    match_override: false,
    ...overrides,
});

const member = (
    memberSlug: string,
    score: number,
    matchOverride = false,
): FamilyScratch => ({
    slug: memberSlug,
    score,
    match_override: matchOverride,
});

describe("isMatchedScratch", () => {
    it("treats a zero score as a match", () => {
        expect(isMatchedScratch({ score: 0, match_override: false })).toBe(
            true,
        );
    });

    it("treats a match override as a match", () => {
        expect(isMatchedScratch({ score: 50, match_override: true })).toBe(
            true,
        );
    });

    it("is false otherwise", () => {
        expect(isMatchedScratch({ score: 50, match_override: false })).toBe(
            false,
        );
    });
});

describe("findFamilyMatch", () => {
    it("returns null when there is no family", () => {
        expect(findFamilyMatch(scratch(), null)).toBeNull();
        expect(findFamilyMatch(scratch(), undefined)).toBeNull();
        expect(findFamilyMatch(scratch(), [])).toBeNull();
    });

    it("returns the lowest-scoring improving family member", () => {
        const best = member("best", 25);
        expect(findFamilyMatch(scratch(), [member("worse", 150), best])).toBe(
            best,
        );
    });

    it("does not advertise a scratch as its own fork", () => {
        expect(findFamilyMatch(scratch(), [member(slug, 0)])).toBeNull();
    });

    it("ignores members that do not improve or do not compile", () => {
        expect(
            findFamilyMatch(scratch(), [
                member("worse", 150),
                member("bad", -1),
            ]),
        ).toBeNull();
    });
});

describe("getScratchStatusColor", () => {
    it("returns the improved colour for a better-scoring family member", () => {
        expect(getScratchStatusColor(scratch(), [member("fork", 50)])).toBe(
            STATUS_COLORS.improved,
        );
    });

    it("returns the matched colour for a matching family member", () => {
        expect(getScratchStatusColor(scratch(), [member("fork", 0)])).toBe(
            STATUS_COLORS.matched,
        );
    });

    it("treats a match override as a match", () => {
        expect(
            getScratchStatusColor(scratch(), [member("fork", 40, true)]),
        ).toBe(STATUS_COLORS.matched);
    });

    it("prefers a match over a lower-scoring non-match", () => {
        expect(
            getScratchStatusColor(scratch(), [
                member("better", 25),
                member("fork", 0),
            ]),
        ).toBe(STATUS_COLORS.matched);
    });

    it("shows nothing on a scratch that is already matched", () => {
        expect(
            getScratchStatusColor(scratch({ score: 0 }), [member("fork", 0)]),
        ).toBeNull();
    });

    it("shows nothing on a scratch matched by override", () => {
        expect(
            getScratchStatusColor(
                scratch({ score: 50, match_override: true }),
                [member("fork", 10)],
            ),
        ).toBeNull();
    });

    it("shows nothing when there is no improvement", () => {
        expect(getScratchStatusColor(scratch(), [])).toBeNull();
    });
});
