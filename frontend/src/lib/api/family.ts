import type { TerseScratch } from "./types";

export type FamilyScratch = Pick<
    TerseScratch,
    "slug" | "score" | "match_override"
>;

/** Whether a scratch should be treated as a match (score of 0 or overridden). */
export function isMatchedScratch(
    scratch: Pick<TerseScratch, "score" | "match_override">,
): boolean {
    return scratch.score === 0 || scratch.match_override;
}

/**
 * Find the scratch in a family that most improves a given scratch, mirroring
 * the scratch page's improvement banner: the lowest-scoring *other* scratch
 * that compiles and scores better. Returns null when there is none.
 */
export function findFamilyMatch<T extends FamilyScratch>(
    scratch: Pick<TerseScratch, "slug" | "score">,
    family: readonly T[] | undefined | null,
): T | null {
    if (!family) {
        return null;
    }

    return family
        .filter(
            (s) =>
                s.slug !== scratch.slug &&
                s.score < scratch.score &&
                s.score > -1,
        )
        .reduce<T | null>(
            (lowest, current) =>
                !lowest || current.score < lowest.score ? current : lowest,
            null,
        );
}

/** A matched and an improved fork share one glyph; only the colour differs. */
export const STATUS_COLORS = {
    matched: "#a855f7",
    improved: "#4273e1",
} as const;

/**
 * Colour for the fork-status token on a scratch's Open Graph image, mirroring
 * the scratch page's banner: nothing on a scratch that is itself matched, and
 * a matched fork takes priority over a merely better-scoring one.
 */
export function getScratchStatusColor(
    scratch: Pick<TerseScratch, "slug" | "score" | "match_override">,
    family: readonly FamilyScratch[] | undefined | null,
): string | null {
    if (isMatchedScratch(scratch)) {
        return null;
    }

    const match = findFamilyMatch(scratch, family);
    if (!match) {
        return null;
    }

    return isMatchedScratch(match)
        ? STATUS_COLORS.matched
        : STATUS_COLORS.improved;
}
