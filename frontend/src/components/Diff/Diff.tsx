/* eslint css-modules/no-unused-class: off */

import {
    createContext,
    type CSSProperties,
    forwardRef,
    type HTMLAttributes,
    type RefObject,
    useRef,
    useState,
} from "react";

import { VersionsIcon } from "@primer/octicons-react";
import type { EditorView } from "codemirror";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList } from "react-window";

import type * as api from "@/lib/api";
import { useSize } from "@/lib/hooks";
import { ThreeWayDiffBase, useCodeFontSize } from "@/lib/settings";

import LoadingSpinner from "../loading.svg";

import styles from "./Diff.module.scss";
import * as AsmDiffer from "./DiffRowAsmDiffer";
import DragBar from "./DragBar";
import { useHighlighers } from "./Highlighter";
import CopyButton from "../CopyButton";

const diffContentsToString = (diff: api.DiffOutput, kind: string): string => {
    // kind is either "base", "current", or "previous"
    const contents = diff.rows.map((row) => {
        let text = "";
        if (kind === "base" && row.base) {
            text = row.base.text.map((t) => t.text).join("");
        } else if (kind === "current" && row.current) {
            text = row.current.text.map((t) => t.text).join("");
        } else if (kind === "previous" && row.previous) {
            text = row.previous.text.map((t) => t.text).join("");
        }
        return text;
    });

    return contents.join("\n");
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

function DiffBody({
    diff,
    diffLabel,
    fontSize,
}: {
    diff: api.DiffOutput | null;
    diffLabel: string | null;
    fontSize: number | undefined;
}) {
    const { highlighters, setHighlightAll } = useHighlighers(3);

    if (!diff) {
        return <div className={styles.bodyContainer} />;
    }

    const itemData = AsmDiffer.createDiffListData(
        diff,
        diffLabel,
        highlighters,
    );

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
                        itemCount={itemData.itemCount}
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

function ThreeWayToggleButton({
    enabled,
    setEnabled,
}: { enabled: boolean; setEnabled: (enabled: boolean) => void }) {
    return (
        <button
            className={styles.threeWayToggle}
            onClick={() => {
                setEnabled(!enabled);
            }}
            title={
                enabled
                    ? "Disable three-way diffing"
                    : "Enable three-way diffing"
            }
        >
            <VersionsIcon size={24} />
            <div className={styles.threeWayToggleNumber}>
                {enabled ? "3" : "2"}
            </div>
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

export const SelectedSourceLineContext = createContext<number | null>(null);

export type Props = {
    diff: api.DiffOutput | null;
    diffLabel: string | null;
    isCompiling: boolean;
    isCurrentOutdated: boolean;
    threeWayDiffEnabled: boolean;
    setThreeWayDiffEnabled: (value: boolean) => void;
    threeWayDiffBase: ThreeWayDiffBase;
    selectedSourceLine: number | null;
};

export default function Diff({
    diff,
    diffLabel,
    isCompiling,
    isCurrentOutdated,
    threeWayDiffEnabled,
    setThreeWayDiffEnabled,
    threeWayDiffBase,
    selectedSourceLine,
}: Props) {
    const [fontSize] = useCodeFontSize();

    const container = useSize<HTMLDivElement>();

    const [bar1Pos, setBar1Pos] = useState(Number.NaN);
    const [bar2Pos, setBar2Pos] = useState(Number.NaN);

    const columnMinWidth = 100;
    const clampedBar1Pos = Math.max(
        columnMinWidth,
        Math.min(
            container.width -
                columnMinWidth -
                (threeWayDiffEnabled ? columnMinWidth : 0),
            bar1Pos,
        ),
    );
    const clampedBar2Pos = threeWayDiffEnabled
        ? Math.max(
              clampedBar1Pos + columnMinWidth,
              Math.min(container.width - columnMinWidth, bar2Pos),
          )
        : container.width;

    // Distribute the bar positions across the container when its width changes
    const updateBarPositions = (threeWayDiffEnabled: boolean) => {
        const numSections = threeWayDiffEnabled ? 3 : 2;
        setBar1Pos(container.width / numSections);
        setBar2Pos((container.width / numSections) * 2);
    };
    const lastContainerWidthRef = useRef(Number.NaN);
    if (lastContainerWidthRef.current !== container.width && container.width) {
        lastContainerWidthRef.current = container.width;
        updateBarPositions(threeWayDiffEnabled);
    }

    const threeWayButton = (
        <>
            <div className={styles.spacer} />
            <ThreeWayToggleButton
                enabled={threeWayDiffEnabled}
                setEnabled={(enabled: boolean) => {
                    updateBarPositions(enabled);
                    setThreeWayDiffEnabled(enabled);
                }}
            />
        </>
    );

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
            <DragBar pos={clampedBar1Pos} onChange={setBar1Pos} />
            {threeWayDiffEnabled && (
                <DragBar pos={clampedBar2Pos} onChange={setBar2Pos} />
            )}
            <div className={styles.headers}>
                <div className={styles.header}>
                    Target
                    <CopyButton
                        title="Copy content"
                        text={() =>
                            diffContentsToString(diff as api.DiffOutput, "base")
                        }
                    />
                </div>
                <div className={styles.header}>
                    Current
                    <CopyButton
                        title="Copy content"
                        text={() =>
                            diffContentsToString(
                                diff as api.DiffOutput,
                                "current",
                            )
                        }
                    />
                    {isCompiling && <LoadingSpinner className="size-6" />}
                    {!threeWayDiffEnabled && threeWayButton}
                </div>
                {threeWayDiffEnabled && (
                    <div className={styles.header}>
                        {threeWayDiffBase === ThreeWayDiffBase.SAVED
                            ? "Saved"
                            : "Previous"}
                        <CopyButton
                            title="Copy content"
                            text={() =>
                                diffContentsToString(
                                    diff as api.DiffOutput,
                                    "previous",
                                )
                            }
                        />
                        {threeWayButton}
                    </div>
                )}
            </div>
            <SelectedSourceLineContext.Provider value={selectedSourceLine}>
                <DiffBody
                    diff={diff}
                    diffLabel={diffLabel}
                    fontSize={fontSize}
                />
            </SelectedSourceLineContext.Provider>
        </div>
    );
}
