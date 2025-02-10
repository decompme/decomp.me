import Select from "@/components/Select2";
import type { TerseScratch } from "@/lib/api";

export enum SortMode {
    NEWEST_FIRST = "-creation_time",
    OLDEST_FIRST = "creation_time",
    LAST_UPDATED = "-last_updated",
    LEAST_MATCHED = "match_percent",
    MOST_MATCHED = "-match_percent",
}

export function produceSortFunction(
    sortMode: SortMode,
): (a: TerseScratch, b: TerseScratch) => number {
    switch (sortMode) {
        case SortMode.NEWEST_FIRST:
            return (a, b) =>
                new Date(b.creation_time).getTime() -
                new Date(a.creation_time).getTime();
        case SortMode.OLDEST_FIRST:
            return (a, b) =>
                new Date(a.creation_time).getTime() -
                new Date(b.creation_time).getTime();
        case SortMode.LAST_UPDATED: // most recent first
            return (a, b) =>
                new Date(b.last_updated).getTime() -
                new Date(a.last_updated).getTime();
        case SortMode.LEAST_MATCHED:
            return (a, b) => compareScratchScores(b, a);
        case SortMode.MOST_MATCHED:
            return compareScratchScores;
    }
}

export function compareScratchScores(a: TerseScratch, b: TerseScratch) {
    // If not compiling, give it a score of Infinity so it's sorted to the end
    const aScore = a.score < 0 ? Number.POSITIVE_INFINITY : a.score;
    const bScore = b.score < 0 ? Number.POSITIVE_INFINITY : b.score;

    // Sort scratches with the same score with most recently updated first
    if (aScore === bScore) {
        return (
            new Date(b.last_updated).getTime() -
            new Date(a.last_updated).getTime()
        );
    }
    return aScore - bScore;
}

export type Props = {
    className?: string;
    sortMode: SortMode;
    setSortMode: (m: SortMode) => void;
};

export default function SortBy({ sortMode, setSortMode }: Props) {
    return (
        <div>
            <span className="mr-2 text-gray-11 text-xs">Sort by</span>
            <Select
                value={sortMode}
                onChange={(m) => {
                    setSortMode(m as SortMode);
                }}
                options={{
                    [SortMode.NEWEST_FIRST]: "Newest first",
                    [SortMode.OLDEST_FIRST]: "Oldest first",
                    [SortMode.LAST_UPDATED]: "Last modified",
                    [SortMode.LEAST_MATCHED]: "Least matched",
                    [SortMode.MOST_MATCHED]: "Most matched",
                }}
            />
        </div>
    );
}
