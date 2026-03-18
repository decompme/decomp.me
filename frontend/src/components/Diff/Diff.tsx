/* eslint css-modules/no-unused-class: off */
import {
    type CSSProperties,
    forwardRef,
    type HTMLAttributes,
    type RefObject,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { FoldIcon, UnfoldIcon } from "@primer/octicons-react";
import type { EditorView } from "codemirror";
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
import DragBar from "./DragBar";
import { useHighlighers } from "./Highlighter";
import CopyButton from "../CopyButton";
import ToggleButton from "./ToggleButton";

type ColumnKey = "base" | "current" | "previous";

const diffContentsToString = (
    diff: api.DiffOutput,
    kind: ColumnKey,
): string => {
    return diff.rows
        .map((row) => row[kind]?.text.map((t) => t.text).join("") ?? "")
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
    diffLabel,
    fontSize,
    compressionEnabled,
    columns,
}: {
    diff: api.DiffOutput | null;
    diffLabel: string | null;
    fontSize: number | undefined;
    compressionEnabled: boolean;
    columns: Array<ColumnKey>;
}) {
    const { highlighters, setHighlightAll } = useHighlighers(3);
    const [compressionContext] = diffCompressionContext();

    const groups = useMemo(() => {
        if (!diff) return [] as DiffGroup[];
        return compressMatching({
            rows: diff.rows,
            context: compressionEnabled ? compressionContext : -1,
        });
    }, [diff, compressionEnabled, compressionContext]);

    const [expandedGroups, setExpandedGroups] = useState<
        Record<string, boolean>
    >({});

    const flattened = useMemo(
        () => flattenGroups(groups, expandedGroups),
        [groups, expandedGroups],
    );

    const visibleRows: VisibleRow[] = useMemo(() => {
        return flattened.map((row) => {
            const isPlaceholder = row.base?.text?.[0]?.format === "diff_skip";

            return {
                key: row.key,
                isPlaceholder,
                cells: columns.map((col: ColumnKey) => row[col]),
            };
        });
    }, [flattened, columns]);

    const itemData: AsmDiffer.DiffListData = useMemo(
        () => ({
            rows: visibleRows,
            highlighters,
            onToggle: (key: string) =>
                setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] })),
        }),
        [visibleRows, highlighters],
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

function CompressToggleButton({
    enabled,
    setEnabled,
}: {
    enabled: boolean;
    setEnabled: (enabled: boolean) => void;
}) {
    return (
        <button
            className={styles.compressionToggle}
            onClick={() => {
                setEnabled(!enabled);
            }}
            title={
                enabled
                    ? "Do not compress streaks of matching lines"
                    : "Compress streaks of matching lines"
            }
        >
            {enabled ? <FoldIcon size={24} /> : <UnfoldIcon size={24} />}
        </button>
    );
}

export function scrollToLineNumber(
    editorView: RefObject<EditorView>,
    lineNumber: number,
) {
    if (!editorView) {
        return;
    }
    if (lineNumber <= editorView.current.state.doc.lines) {
        // check if the source line <= number of lines
        // which can be false if pragmas are used to force line numbers
        const line = editorView.current.state.doc.line(lineNumber);
        if (line) {
            const { top } = editorView.current.lineBlockAt(line.to);
            editorView.current.scrollDOM.scrollTo({ top, behavior: "smooth" });
        }
    }
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

/* heavily inspired by compress_matching from diff.py */
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
            if (context > 0) {
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
            } else {
                groups.push({
                    type: "collapsed",
                    key: `group-${groupCount++}`,
                    rows: [...matchingStreak],
                    isExpanded: false,
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

type ColumnState = Record<ColumnKey, boolean>;

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
    diffLabel,
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

    const [bar1Pos, setBar1Pos] = useState<number>(Number.NaN);
    const [bar2Pos, setBar2Pos] = useState<number>(Number.NaN);

    const [columnState, setColumnState] = useState<ColumnState>({
        base: true,
        current: true,
        previous: threeWayDiffEnabled,
    });

    const columns = [
        columnState.base && "base",
        columnState.current && "current",
        columnState.previous && "previous",
    ].filter((col): col is ColumnKey => Boolean(col));

    const columnCount = columns.length || 1;

    const rightmostColumn = columns[columns.length - 1];

    const prevRef = useRef({ width: 0, columnCount: 0 });

    useLayoutEffect(() => {
        const width = container.width;

        if (!width) return;

        const prev = prevRef.current;
        const columnChanged = prev.columnCount !== columnCount;
        const widthChanged = prev.width !== width;

        if (columnChanged) {
            // Reset positions based on new column count
            if (columnCount === 1) {
                setBar1Pos(width);
                setBar2Pos(width);
            } else {
                setBar1Pos(width / columnCount);
                setBar2Pos((width / columnCount) * 2);
            }
        } else if (widthChanged) {
            // Preserve ratios ONLY when width changes
            const ratio1 =
                Number.isNaN(bar1Pos) || !prev.width
                    ? 1 / columnCount
                    : bar1Pos / prev.width;

            const ratio2 =
                Number.isNaN(bar2Pos) || !prev.width
                    ? 2 / columnCount
                    : bar2Pos / prev.width;

            setBar1Pos(width * ratio1);
            setBar2Pos(width * ratio2);
        }

        prevRef.current = { width, columnCount };
    }, [container.width, columnCount, bar1Pos, bar2Pos]);

    const columnMinWidth = 80;

    function clampBars() {
        const width = container.width;

        if (!width || columnCount <= 1) {
            return { bar1: width, bar2: width };
        } else if (columnCount === 2) {
            const b1 = Number.isNaN(bar1Pos) ? width / 2 : bar1Pos;

            const clampedBar1 = Math.max(
                columnMinWidth,
                Math.min(width - columnMinWidth, b1),
            );

            return { bar1: clampedBar1, bar2: width };
        } else {
            const b1 = Number.isNaN(bar1Pos) ? width / 3 : bar1Pos;
            const b2 = Number.isNaN(bar2Pos) ? (width / 3) * 2 : bar2Pos;

            const clampedBar1 = Math.max(
                columnMinWidth,
                Math.min(width - columnMinWidth * 2, b1),
            );

            const clampedBar2 = Math.max(
                clampedBar1 + columnMinWidth,
                Math.min(width - columnMinWidth, b2),
            );

            return { bar1: clampedBar1, bar2: clampedBar2 };
        }
    }

    const { bar1: clampedBar1Pos, bar2: clampedBar2Pos } = clampBars();

    const updateColumns = (updater: (prev: ColumnState) => ColumnState) => {
        setColumnState((prev) => {
            const next = updater(prev);
            if (!next.base && !next.current && !next.previous) return prev;
            return next;
        });
    };
    const setColumn = (key: ColumnKey, value: boolean) => {
        updateColumns((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <div
            ref={container.ref}
            className={styles.diff}
            style={
                {
                    "--diff-font-size":
                        typeof fontSize === "number" ? `${fontSize}px` : "",
                    "--diff-left-width": `${clampedBar1Pos}px`,
                    "--diff-right-width": `${container.width - clampedBar2Pos}px`,
                    "--diff-current-filter": isCurrentOutdated
                        ? "grayscale(25%) brightness(70%)"
                        : "",
                } as CSSProperties
            }
        >
            {columnCount >= 2 && (
                <DragBar pos={clampedBar1Pos} onChange={setBar1Pos} />
            )}
            {columnCount === 3 && (
                <DragBar pos={clampedBar2Pos} onChange={setBar2Pos} />
            )}
            <div className={styles.headers}>
                {columns.map((col) => (
                    <div key={col} className={styles.header}>
                        {col === "base" && "Target"}
                        {col === "current" && "Current"}
                        {col === "previous" &&
                            (threeWayDiffBase === ThreeWayDiffBase.SAVED
                                ? "Saved"
                                : "Previous")}
                        <CopyButton
                            title="Copy content"
                            size={12}
                            text={() =>
                                diff ? diffContentsToString(diff, col) : ""
                            }
                        />
                        {col === "current" && isCompiling && (
                            <LoadingSpinner className="size-6" />
                        )}

                        {col === rightmostColumn && (
                            <>
                                <div className={styles.spacer} />
                                <ToggleButton
                                    label="T"
                                    title={"Target column"}
                                    enabled={columnState.base}
                                    setEnabled={(enabled) =>
                                        setColumn("base", enabled)
                                    }
                                />
                                <ToggleButton
                                    label="C"
                                    title={"Current column"}
                                    enabled={columnState.current}
                                    setEnabled={(enabled) =>
                                        setColumn("current", enabled)
                                    }
                                />
                                <ToggleButton
                                    label="3"
                                    title={"3-way diff"}
                                    enabled={columnState.previous}
                                    setEnabled={(enabled) => {
                                        setColumn("previous", enabled);
                                        setThreeWayDiffEnabled(enabled);
                                    }}
                                />
                                <CompressToggleButton
                                    enabled={compressionEnabled}
                                    setEnabled={setCompressionEnabled}
                                />
                            </>
                        )}
                    </div>
                ))}
            </div>

            <DiffBody
                diff={diff}
                diffLabel={diffLabel}
                compressionEnabled={compressionEnabled}
                fontSize={fontSize}
                columns={columns}
            />
        </div>
    );
}
