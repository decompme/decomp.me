/* eslint css-modules/no-unused-class: off */
import {
    type CSSProperties,
    forwardRef,
    type HTMLAttributes,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { FoldIcon, SearchIcon } from "@primer/octicons-react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList } from "react-window";

import type * as api from "@/lib/api";
import { useSize } from "@/lib/hooks";
import {
    ThreeWayDiffBase,
    useCodeFontSize,
    diffCompressionContext,
} from "@/lib/settings";

import LoadingSpinner from "../loading.svg";

import styles from "./Diff.module.scss";
import * as AsmDiffer from "./DiffRowAsmDiffer";
import { type DiffSearchMatch, findDiffSearchMatches } from "./DiffSearch";
import DiffSearchPanel from "./DiffSearchPanel";
import DragBar from "./DragBar";
import { useHighlighers } from "./Highlighter";
import CopyButton from "../CopyButton";
import ToggleButton from "./ToggleButton";
import { useResizableColumns } from "./hooks";

type ColumnKey = "base" | "current" | "previous";
type ColumnState = Record<ColumnKey, boolean>;
const ALL_COLUMNS: ColumnKey[] = ["base", "current", "previous"];
const DIFF_SEARCH_DEBOUNCE_MS = 150;
const DIFF_SEARCH_MAX_MATCHES = 1000;

function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timeoutId = window.setTimeout(
            () => setDebouncedValue(value),
            delayMs,
        );
        return () => window.clearTimeout(timeoutId);
    }, [value, delayMs]);

    return debouncedValue;
}

const diffContentsToString = (
    diff: api.DiffOutput,
    kind: ColumnKey,
): string => {
    return diff.rows
        .map((row) => row[kind]?.text?.map((t) => t.text).join("") ?? "")
        .join("\n");
};

// https://github.com/bvaughn/react-window#can-i-add-padding-to-the-top-and-bottom-of-a-list
const innerElementType = forwardRef<
    HTMLUListElement,
    HTMLAttributes<HTMLUListElement>
>(({ style, ...rest }, ref) => {
    return (
        <ul
            ref={ref}
            style={{
                ...style,
                height: `${Number.parseFloat(style.height.toString()) + PADDING_TOP + PADDING_BOTTOM}px`,
            }}
            {...rest}
        />
    );
});
innerElementType.displayName = "innerElementType";

export type VisibleRow = {
    key: string;
    cells: Array<api.DiffCell | undefined>;
    isPlaceholder?: boolean;
};

function DiffBody({
    diff,
    fontSize,
    rows,
    onToggle,
    activeSearchMatch,
}: {
    diff: api.DiffOutput | null;
    fontSize: number | undefined;
    rows: VisibleRow[];
    onToggle: (key: string) => void;
    activeSearchMatch: DiffSearchMatch | null;
}) {
    const { highlighters, setHighlightAll } = useHighlighers(3);
    const listRef = useRef<FixedSizeList>(null);

    useEffect(() => {
        if (activeSearchMatch) {
            listRef.current?.scrollToItem(activeSearchMatch.rowIndex, "center");
        }
    }, [activeSearchMatch]);

    const itemData = useMemo(
        () => ({
            rows,
            highlighters,
            onToggle,
            activeSearchMatch,
        }),
        [rows, highlighters, onToggle, activeSearchMatch],
    );

    if (!diff) {
        return <div className={styles.bodyContainer} />;
    }

    return (
        <div
            className={styles.bodyContainer}
            onClick={() => {
                // If clicks propagate to the container, clear all
                setHighlightAll(null);
            }}
        >
            <AutoSizer>
                {({
                    height,
                    width,
                }: {
                    height: number | undefined;
                    width: number | undefined;
                }) => (
                    <FixedSizeList
                        ref={listRef}
                        className={styles.body}
                        itemCount={itemData.rows.length}
                        itemData={itemData}
                        itemSize={(fontSize ?? 12) * 1.33}
                        overscanCount={40}
                        width={width}
                        height={height}
                        innerElementType={innerElementType}
                    >
                        {AsmDiffer.DiffRow}
                    </FixedSizeList>
                )}
            </AutoSizer>
        </div>
    );
}

export const PADDING_TOP = 8;
export const PADDING_BOTTOM = 8;

type DiffGroup =
    | { type: "rows"; key: string; rows: api.DiffRow[] }
    | {
          type: "collapsed";
          key: string;
          rows: api.DiffRow[];
          isExpanded: boolean;
      };

// heavily inspired by compress_matching from diff.py
export function compressMatching({
    rows,
    context,
}: {
    rows: api.DiffRow[];
    context: number;
}): DiffGroup[] {
    if (context < 0) {
        // no compression
        return [{ type: "rows", key: "group-0", rows }];
    }

    const groups: DiffGroup[] = [];
    const matchingStreak: api.DiffRow[] = [];

    const isMatchingRow = (row: api.DiffRow): boolean => {
        const baseTexts = row.base?.text ?? [];
        const currentTexts = row.current?.text ?? [];

        if (baseTexts.length !== currentTexts.length) {
            return false;
        }

        // Rely on asm-differ's opinion
        return baseTexts.every(
            (t, i) => t.format !== "" || currentTexts[i].format !== "",
        );
    };

    let groupCount = 0;

    const flushMatching = () => {
        if (matchingStreak.length === 0) return;

        if (matchingStreak.length <= 2 * context + 1) {
            groups.push({
                type: "rows",
                key: `group-${groupCount++}`,
                rows: [...matchingStreak],
            });
        } else {
            if (context === 0) {
                groups.push({
                    type: "collapsed",
                    key: `group-${groupCount++}`,
                    rows: [...matchingStreak],
                    isExpanded: false,
                });
            } else {
                groups.push({
                    type: "rows",
                    key: `group-${groupCount++}`,
                    rows: matchingStreak.slice(0, context),
                });
                groups.push({
                    type: "collapsed",
                    key: `group-${groupCount++}`,
                    rows: matchingStreak.slice(context, -context),
                    isExpanded: false,
                });
                groups.push({
                    type: "rows",
                    key: `group-${groupCount++}`,
                    rows: matchingStreak.slice(-context),
                });
            }
        }

        matchingStreak.length = 0; // clear
    };

    for (const row of rows) {
        if (isMatchingRow(row)) {
            matchingStreak.push(row);
        } else {
            flushMatching();
            groups.push({
                type: "rows",
                key: `group-${groupCount++}`,
                rows: [row],
            });
        }
    }

    flushMatching();
    return groups;
}

export function flattenGroups(
    groups: DiffGroup[],
    expandedGroups: Record<string, boolean>,
): api.DiffRow[] {
    const flat: api.DiffRow[] = [];
    for (const group of groups) {
        switch (group.type) {
            case "rows": {
                flat.push(...group.rows);
                break;
            }
            case "collapsed": {
                const format = "diff_skip";
                const isExpanded =
                    expandedGroups[group.key] ?? group.isExpanded;
                const placeholder: api.DiffRow = {
                    key: group.key,
                    base: {
                        text: [
                            {
                                text: `${isExpanded ? "▼ Collapse" : "▶ Expand"} ${group.rows.length} matching lines`,
                                format,
                            },
                        ],
                    },
                    current: { text: [{ text: "", format }] },
                    previous: { text: [{ text: "", format }] },
                };
                flat.push(placeholder);
                if (isExpanded) {
                    flat.push(...group.rows);
                }
                break;
            }
        }
    }
    return flat;
}

type LocalColumnState = {
    base: boolean;
    current: boolean;
};

export type Props = {
    diff: api.DiffOutput | null;
    diffLabel: string | null;
    isCompiling: boolean;
    isCurrentOutdated: boolean;
    threeWayDiffEnabled: boolean;
    setThreeWayDiffEnabled: (value: boolean) => void;
    compressionEnabled: boolean;
    setCompressionEnabled: (value: boolean) => void;
    threeWayDiffBase: ThreeWayDiffBase;
};

export default function Diff({
    diff,
    isCompiling,
    isCurrentOutdated,
    threeWayDiffEnabled,
    setThreeWayDiffEnabled,
    compressionEnabled,
    setCompressionEnabled,
    threeWayDiffBase,
}: Props) {
    const [fontSize] = useCodeFontSize();
    const container = useSize<HTMLDivElement>();
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [compressionContext] = diffCompressionContext();
    const [expandedGroups, setExpandedGroups] = useState<
        Record<string, boolean>
    >({});
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebouncedValue(
        searchQuery,
        DIFF_SEARCH_DEBOUNCE_MS,
    );
    const isSearchSettled = searchQuery === debouncedSearchQuery;
    const [activeSearchIndex, setActiveSearchIndex] = useState(0);

    const [columnState, setColumnState] = useState<LocalColumnState>({
        base: true,
        current: true,
    });
    const fullColumnState: ColumnState = {
        ...columnState,
        previous: threeWayDiffEnabled,
    };
    const columns = ALL_COLUMNS.filter((col) => fullColumnState[col]);
    const columnCount = columns.length;
    const leftmostColumn = columns[0];
    const rightmostColumn = columns.at(-1);

    const { bar1Px, bar2Px, setBar1Px, setBar2Px } = useResizableColumns({
        width: container.width,
        columnCount,
    });

    const groups = useMemo(() => {
        if (!diff) return [] as DiffGroup[];
        return compressMatching({
            rows: diff.rows,
            context: compressionEnabled ? compressionContext : -1,
        });
    }, [diff, compressionEnabled, compressionContext]);

    useEffect(() => {
        setExpandedGroups({});
    }, [groups]);

    const flattened = useMemo(
        () => flattenGroups(groups, expandedGroups),
        [groups, expandedGroups],
    );

    const visibleRows: VisibleRow[] = useMemo(() => {
        const getCells = (row: api.DiffRow) => columns.map((col) => row[col]);

        return flattened.map((row) => {
            const isPlaceholder = row.base?.text?.[0]?.format === "diff_skip";

            return {
                key: row.key,
                isPlaceholder,
                cells: getCells(row),
            };
        });
    }, [flattened, columns]);

    const searchResult = useMemo(
        () =>
            findDiffSearchMatches(
                visibleRows,
                debouncedSearchQuery,
                DIFF_SEARCH_MAX_MATCHES,
            ),
        [visibleRows, debouncedSearchQuery],
    );
    const searchMatches = searchResult.matches;
    const activeSearchMatch = isSearchSettled
        ? (searchMatches[activeSearchIndex] ?? null)
        : null;

    useEffect(() => {
        if (!searchOpen) return;
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
    }, [searchOpen]);

    useEffect(() => {
        setActiveSearchIndex(0);
    }, [debouncedSearchQuery]);

    useEffect(() => {
        if (searchMatches.length === 0) {
            setActiveSearchIndex(0);
            return;
        }

        setActiveSearchIndex((index) =>
            Math.min(index, searchMatches.length - 1),
        );
    }, [searchMatches.length]);

    const goToSearchMatch = useCallback(
        (direction: 1 | -1) => {
            if (!isSearchSettled || searchMatches.length === 0) return;
            setActiveSearchIndex((index) => {
                const next = index + direction;
                if (next < 0) return searchMatches.length - 1;
                if (next >= searchMatches.length) return 0;
                return next;
            });
        },
        [isSearchSettled, searchMatches.length],
    );

    const handleToggleGroup = useCallback((key: string) => {
        setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const COLUMN_LABELS = {
        base: "Target",
        current: "Current",
        previous:
            threeWayDiffBase === ThreeWayDiffBase.SAVED ? "Saved" : "Previous",
    };

    const updateColumns = (
        updater: (prev: LocalColumnState) => LocalColumnState,
    ) => {
        setColumnState((prev) => {
            const next = updater(prev);
            const hasOtherColumns =
                next.base || next.current || threeWayDiffEnabled;
            if (!hasOtherColumns) return prev;
            return next;
        });
    };
    const setColumn = (key: ColumnKey, value: boolean) => {
        updateColumns((prev) => ({ ...prev, [key]: value }));
    };
    const handleSetThreeWayDiff = (enabled: boolean) => {
        const hasOtherColumns =
            columnState.base || columnState.current || enabled;
        if (!hasOtherColumns) return;
        setThreeWayDiffEnabled(enabled);
    };

    return (
        <div
            ref={container.ref}
            className={styles.diff}
            style={
                {
                    "--diff-font-size":
                        typeof fontSize === "number" ? `${fontSize}px` : "",
                    "--diff-left-width": `${bar1Px}px`,
                    "--diff-right-width": `${container.width - bar2Px}px`,
                    "--diff-current-filter": isCurrentOutdated
                        ? "grayscale(25%) brightness(70%)"
                        : "",
                } as CSSProperties
            }
        >
            {columnCount >= 2 && <DragBar pos={bar1Px} onChange={setBar1Px} />}
            {columnCount === 3 && <DragBar pos={bar2Px} onChange={setBar2Px} />}
            <div className={styles.headers}>
                {columns.map((col) => (
                    <div key={col} className={styles.header}>
                        {COLUMN_LABELS[col]}
                        <CopyButton
                            title="Copy content"
                            size={12}
                            text={() =>
                                diff ? diffContentsToString(diff, col) : ""
                            }
                        />
                        {col === leftmostColumn && (
                            <button
                                type="button"
                                className={styles.searchButton}
                                aria-label="Search diff"
                                title="Search diff"
                                onClick={() => setSearchOpen(true)}
                            >
                                <SearchIcon size={12} />
                            </button>
                        )}
                        {col === "current" && isCompiling && (
                            <LoadingSpinner className="size-6" />
                        )}

                        {col === rightmostColumn && (
                            <>
                                <div className={styles.spacer} />
                                <ToggleButton
                                    label="T"
                                    title="Target column"
                                    enabled={columnState.base}
                                    setEnabled={(enabled) =>
                                        setColumn("base", enabled)
                                    }
                                />
                                <ToggleButton
                                    label="C"
                                    title="Current column"
                                    enabled={columnState.current}
                                    setEnabled={(enabled) =>
                                        setColumn("current", enabled)
                                    }
                                />
                                <ToggleButton
                                    label="3"
                                    title="3-way diff"
                                    enabled={threeWayDiffEnabled}
                                    setEnabled={handleSetThreeWayDiff}
                                />
                                <ToggleButton
                                    label={<FoldIcon size={16} />}
                                    disabledLabel="Collapse streaks of "
                                    enabledLabel="Show all "
                                    title="matching lines"
                                    padding="px-1 py-1"
                                    enabled={compressionEnabled}
                                    setEnabled={setCompressionEnabled}
                                />
                            </>
                        )}
                    </div>
                ))}
            </div>

            {searchOpen && (
                <DiffSearchPanel
                    query={searchQuery}
                    inputRef={searchInputRef}
                    activeIndex={activeSearchIndex}
                    matchCount={searchMatches.length}
                    capped={searchResult.capped}
                    isSettled={isSearchSettled}
                    onQueryChange={setSearchQuery}
                    onPrevious={() => goToSearchMatch(-1)}
                    onNext={() => goToSearchMatch(1)}
                    onClose={() => setSearchOpen(false)}
                />
            )}

            <DiffBody
                diff={diff}
                fontSize={fontSize}
                rows={visibleRows}
                onToggle={handleToggleGroup}
                activeSearchMatch={searchOpen ? activeSearchMatch : null}
            />
        </div>
    );
}
