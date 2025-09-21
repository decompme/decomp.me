/* eslint css-modules/no-unused-class: off */

import {
    type CSSProperties,
    type MouseEvent,
    type RefObject,
    memo,
    useContext,
} from "react";

import clsx from "clsx";
import type { EditorView } from "codemirror";
import { areEqual } from "react-window";

import type * as api from "@/lib/api";
import { scrollToLineNumber } from "@/lib/codemirror/scrollToLineNumber";
import * as settings from "@/lib/settings";

import { ScrollContext } from "../ScrollContext";
import { useSelectedSourceLine } from "../SelectedSourceLineContext";
import { PADDING_TOP, type VisibleRow } from "./Diff";
import type { DiffSearchMatch } from "./DiffSearch";
import styles from "./Diff.module.scss";
import type { Highlighter } from "./Highlighter";

// Regex for tokenizing lines for click-to-highlight purposes.
// Strings matched by the first regex group (spaces, punctuation)
// are treated as non-highlightable.
const RE_TOKEN = /([ \t,()[\]:]+|~>)|%(?:lo|hi)\([^)]+\)|[^ \t,()[\]:]+/g;

function FormatDiffText({
    texts,
    highlighter,
    searchMatch,
}: {
    texts: api.DiffText[];
    highlighter: Highlighter;
    searchMatch?: DiffSearchMatch;
}) {
    let cellOffset = 0;

    return (
        <>
            {" "}
            {texts.map((t, index1) => {
                const textOffset = cellOffset;
                cellOffset += t.text.length;

                return Array.from(t.text.matchAll(RE_TOKEN)).map(
                    (match, index2) => {
                        const text = match[0];
                        const tokenStart = textOffset + (match.index ?? 0);
                        const tokenEnd = tokenStart + text.length;
                        const isPlaceholder = t.format === "diff_skip";
                        const isToken = !match[1] && !isPlaceholder;
                        const key = `${index1},${index2}`;
                        const searchStart =
                            searchMatch &&
                            Math.max(searchMatch.start, tokenStart) -
                                tokenStart;
                        const searchEnd =
                            searchMatch &&
                            Math.min(searchMatch.end, tokenEnd) - tokenStart;
                        const hasSearchMatch =
                            typeof searchStart === "number" &&
                            typeof searchEnd === "number" &&
                            searchStart < searchEnd;

                        let className: string | undefined;
                        if (t.format === "rotation") {
                            className = styles[`rotation${t.index % 9}`];
                        } else if (t.format) {
                            className = styles[t.format];
                        }

                        const handleClick = (e: MouseEvent) => {
                            if (isToken) {
                                highlighter.select(text);
                                e.stopPropagation();
                            }
                        };

                        if (hasSearchMatch) {
                            const before = text.slice(0, searchStart);
                            const matchText = text.slice(
                                searchStart,
                                searchEnd,
                            );
                            const after = text.slice(searchEnd);

                            return (
                                <span
                                    key={key}
                                    className={clsx(className, {
                                        [styles.highlightable]: isToken,
                                        [styles.highlighted]:
                                            highlighter.value === text,
                                    })}
                                    onClick={handleClick}
                                >
                                    {before}
                                    <span className={styles.searchMatch}>
                                        {matchText}
                                    </span>
                                    {after}
                                </span>
                            );
                        }

                        return (
                            <span
                                key={key}
                                className={clsx(className, {
                                    [styles.highlightable]: isToken,
                                    [styles.highlighted]:
                                        highlighter.value === text,
                                })}
                                onClick={handleClick}
                            >
                                {text}
                            </span>
                        );
                    },
                );
            })}
        </>
    );
}

function DiffCell({
    cell,
    className,
    highlighter,
    searchMatch,
}: {
    cell: api.DiffCell | undefined;
    className?: string;
    highlighter: Highlighter;
    searchMatch?: DiffSearchMatch;
}) {
    const { selectedSourceLine } = useSelectedSourceLine();
    const sourceEditor = useContext<RefObject<EditorView>>(ScrollContext);
    const hasLineNo = typeof cell?.src_line !== "undefined";

    const [diffCellBackgroundEnabled] = settings.diffCellBackgroundEnabled();

    if (!cell) return <div className={clsx(styles.cell, className)} />;

    const bgClassName = diffCellBackgroundEnabled
        ? (() => {
              for (const item of cell.text) {
                  if (item.format === "diff_add") return styles.diff_add_row;
                  if (item.format === "diff_remove")
                      return styles.diff_remove_row;
                  if (item.format === "diff_change")
                      return styles.diff_change_row;
                  if (item.format === "diff_skip") return styles.diff_skip_row;
              }
              return null;
          })()
        : null;

    return (
        <div
            className={clsx(styles.cell, className, bgClassName, {
                [styles.highlight]:
                    hasLineNo && cell.src_line === selectedSourceLine,
                [styles.searchMatchCell]: searchMatch,
            })}
        >
            {hasLineNo && (
                <span className={styles.lineNumber}>
                    <button
                        onClick={() =>
                            scrollToLineNumber(sourceEditor, cell.src_line)
                        }
                    >
                        {cell.src_line}
                    </button>
                </span>
            )}
            <FormatDiffText
                texts={cell.text}
                highlighter={highlighter}
                searchMatch={searchMatch}
            />
        </div>
    );
}

export type DiffListData = {
    rows: VisibleRow[];
    highlighters: Highlighter[];
    onToggle: (groupKey: string) => void;
    activeSearchMatch: DiffSearchMatch | null;
};

export const DiffRow = memo(function DiffRow({
    data,
    index,
    style,
}: {
    data: DiffListData;
    index: number;
    style: CSSProperties;
}) {
    const row = data.diff?.rows?.[index];
    return (
        <li
            className={clsx(styles.row, row.isPlaceholder && styles.collapsed)}
            style={{
                ...style,
                top: `${Number.parseFloat(style.top.toString()) + PADDING_TOP}px`,
                lineHeight: `${style.height.toString()}px`,
            }}
            onClick={
                row.isPlaceholder ? () => data.onToggle(row.key) : undefined
            }
        >
            {row.cells.map((cell, i) => (
                <DiffCell
                    key={i}
                    cell={cell}
                    highlighter={data.highlighters[i]}
                    searchMatch={
                        data.activeSearchMatch?.rowIndex === index &&
                        data.activeSearchMatch.columnIndex === i
                            ? data.activeSearchMatch
                            : undefined
                    }
                />
            ))}
        </li>
    );
}, areEqual);
