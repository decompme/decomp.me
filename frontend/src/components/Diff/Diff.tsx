/* eslint css-modules/no-unused-class: off */
import {
    type CSSProperties,
    forwardRef,
    type HTMLAttributes,
    type RefObject,
    useEffect,
    useMemo,
    useState,
} from "react";

import { FoldIcon } from "@primer/octicons-react";
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
import { useResizableColumns } from "./hooks";

type ColumnKey = "base" | "current" | "previous";
type ColumnState = Record<ColumnKey, boolean>;
const ALL_COLUMNS: ColumnKey[] = ["base", "current", "previous"];

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

    const handleToggle = (key: string) => {
        setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
    };
    const itemData = useMemo(
        () => ({
            rows: visibleRows,
            highlighters,
            onToggle: handleToggle,
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

export function scrollToLineNumber(
    editorView: RefObject<EditorView>,
    lineNumber: number,
) {
    const view = editorView.current;
    if (!view) return;
    if (lineNumber <= view.state.doc.lines) {
        // check if the source line <= number of lines
        // which can be false if pragmas are used to force line numbers
        const line = view.state.doc.line(lineNumber);
        if (line) {
            const { top } = view.lineBlockAt(line.to);
            view.scrollDOM.scrollTo({ top, behavior: "smooth" });
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
    const rightmostColumn = columns.at(-1);

    const { bar1Px, bar2Px, setBar1Px, setBar2Px } = useResizableColumns({
        width: container.width,
        columnCount,
    });

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
