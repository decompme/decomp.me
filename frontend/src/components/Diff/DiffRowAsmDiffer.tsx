/* eslint css-modules/no-unused-class: off */

import { type CSSProperties, type RefObject, memo, useContext } from "react";

import clsx from "clsx";
import type { EditorView } from "codemirror";
import { areEqual } from "react-window";

import type * as api from "@/lib/api";
import * as settings from "@/lib/settings";

import { ScrollContext } from "../ScrollContext";
import { useSelectedSourceLine } from "../SelectedSourceLineContext";
import { PADDING_TOP, scrollToLineNumber } from "./Diff";
import styles from "./Diff.module.scss";
import type { Highlighter } from "./Highlighter";

// Regex for tokenizing lines for click-to-highlight purposes.
// Strings matched by the first regex group (spaces, punctuation)
// are treated as non-highlightable.
const RE_TOKEN = /([ \t,()[\]:]+|~>)|%(?:lo|hi)\([^)]+\)|[^ \t,()[\]:]+/g;

function FormatDiffText({
    texts,
    highlighter,
}: {
    texts: api.DiffText[];
    highlighter: Highlighter;
}) {
    return (
        <>
            {" "}
            {texts.map((t, index1) =>
                Array.from(t.text.matchAll(RE_TOKEN)).map((match, index2) => {
                    const text = match[0];
                    const isPlaceholder = t.format === "diff_skip";
                    const isToken = !match[1] && !isPlaceholder;
                    const key = `${index1},${index2}`;

                    let className: string;
                    if (t.format === "rotation") {
                        className = styles[`rotation${t.index % 9}`];
                    } else if (t.format) {
                        className = styles[t.format];
                    }

                    return (
                        <span
                            key={key}
                            className={clsx(className, {
                                [styles.highlightable]: isToken,
                                [styles.highlighted]:
                                    highlighter.value === text,
                            })}
                            onClick={(e) => {
                                if (isToken) {
                                    highlighter.select(text);
                                    e.stopPropagation();
                                }
                            }}
                        >
                            {text}
                        </span>
                    );
                }),
            )}
        </>
    );
}

function DiffCell({
    cell,
    className,
    highlighter,
}: {
    cell: api.DiffCell | undefined;
    className?: string;
    highlighter: Highlighter;
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
            <FormatDiffText texts={cell.text} highlighter={highlighter} />
        </div>
    );
}

export type DiffListData = {
    rows: api.DiffRow[];
    highlighters: Highlighter[];
    onToggle: (groupKey: string) => void;
};

export const DiffRow = memo(function DiffRow({
    data,
    index,
    style,
}: { data: DiffListData; index: number; style: CSSProperties }) {
    const row = data.rows[index];
    const isPlaceholder = row.base?.text?.[0]?.format === "diff_skip";

    return (
        <li
            className={clsx(styles.row, isPlaceholder && styles.collapsed)}
            style={{
                ...style,
                top: `${Number.parseFloat(style.top.toString()) + PADDING_TOP}px`,
                lineHeight: `${style.height.toString()}px`,
            }}
            onClick={isPlaceholder ? () => data.onToggle(row.key) : undefined}
        >
            <DiffCell cell={row.base} highlighter={data.highlighters[0]} />
            <DiffCell cell={row.current} highlighter={data.highlighters[1]} />
            <DiffCell cell={row.previous} highlighter={data.highlighters[2]} />
        </li>
    );
}, areEqual);
