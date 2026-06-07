import {
    type CSSProperties,
    type RefObject,
    useCallback,
    useEffect,
    useRef,
} from "react";

import { addCursorAbove, addCursorBelow } from "@codemirror/commands";
import { type Extension, EditorState, Prec } from "@codemirror/state";
import { EditorView, placeholder, keymap } from "@codemirror/view";
import clsx from "clsx";
import { useDebouncedCallback } from "use-debounce";

import { useSize } from "@/lib/hooks";
import { useCodeFontSize } from "@/lib/settings";

import styles from "./CodeMirror.module.scss";

// useDebouncedCallback is a bit dodgy when both leading and trailing are true, so here's a reimplementation
function useLeadingTrailingDebounceCallback(
    callback: () => void,
    delay: number,
) {
    const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (timeout.current) {
                clearTimeout(timeout.current);
            }
        };
    }, []);

    return useCallback(() => {
        if (timeout.current) {
            clearTimeout(timeout.current);
        } else {
            // Leading
            callback();
        }

        timeout.current = setTimeout(() => {
            timeout.current = null;

            // Trailing
            callback();
        }, delay);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

export interface Props {
    value: string;
    valueVersion: number;
    onChange?: (value: string) => void;
    onHoveredLineChange?: (value: number | null) => void;
    onSelectedLineChange?: (value: number) => void;
    className?: string;
    viewRef?: RefObject<EditorView | null>;
    extensions: Extension; // const
    placeholder?: string;
    dataTour?: string;
}

export default function CodeMirror({
    value,
    valueVersion,
    onChange,
    onHoveredLineChange,
    onSelectedLineChange,
    className,
    viewRef: viewRefProp,
    extensions,
    placeholder: placeholderText,
    dataTour,
}: Props) {
    const { ref: el, width } = useSize<HTMLDivElement>();

    const valueRef = useRef(value);
    valueRef.current = value;

    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const viewRef = useRef<EditorView>(null);

    const extensionsRef = useRef(extensions);
    extensionsRef.current = extensions;

    const selectedLineRef = useRef<number>(-1);
    const hoveredLineRef = useRef<number>(-1);

    const onHoveredLineChangeRef = useRef(onHoveredLineChange);
    onHoveredLineChangeRef.current = onHoveredLineChange;

    const onSelectedLineChangeRef = useRef(onSelectedLineChange);
    onSelectedLineChangeRef.current = onSelectedLineChange;

    const [fontSize] = useCodeFontSize();

    // Defer calls to onChange to avoid excessive re-renders
    const propagateValue = useLeadingTrailingDebounceCallback(() => {
        const view = viewRef.current;
        if (view) {
            onChangeRef.current?.(view.state.doc.toString());
        }
    }, 100);
    const animationFrameIds = useRef(new Set<number>());

    // Initial view creation
    useEffect(() => {
        viewRef.current = new EditorView({
            state: EditorState.create({
                doc: valueRef.current,
                extensions: [
                    placeholder(placeholderText || ""),
                    EditorState.transactionExtender.of(
                        ({ docChanged, newDoc, newSelection }) => {
                            // value / onChange
                            if (docChanged) {
                                valueRef.current = newDoc.toString();
                                propagateValue();
                            }

                            // selectedSourceLine
                            const line = newDoc.lineAt(
                                newSelection.main.from,
                            ).number;
                            if (hoveredLineRef.current !== line) {
                                hoveredLineRef.current = line;
                                const frameId = requestAnimationFrame(() => {
                                    animationFrameIds.current.delete(frameId);
                                    onSelectedLineChangeRef.current?.(line);
                                });
                                animationFrameIds.current.add(frameId);
                            }

                            return null;
                        },
                    ),
                    Prec.highest(
                        keymap.of([
                            { key: "Ctrl-Shift-ArrowUp", run: addCursorAbove },
                            {
                                key: "Ctrl-Shift-ArrowDown",
                                run: addCursorBelow,
                            },
                        ]),
                    ),

                    extensionsRef.current,
                ],
            }),
            parent: el.current,
        });

        if (viewRefProp) viewRefProp.current = viewRef.current;

        return () => {
            for (const frameId of animationFrameIds.current) {
                cancelAnimationFrame(frameId);
            }
            animationFrameIds.current.clear();
            viewRef.current.destroy();
            viewRef.current = null;
            if (viewRefProp) viewRefProp.current = null;
        };
    }, [el, propagateValue, viewRefProp]);

    // Replace doc when `valueVersion` prop changes
    useEffect(() => {
        const view = viewRef.current;
        if (view) {
            const prevValue = view.state.doc.toString();

            if (prevValue !== value) {
                view.dispatch(
                    view.state.update({
                        changes: {
                            from: 0,
                            to: prevValue.length,
                            insert: value,
                        },
                    }),
                );
            }
        }
    }, [valueVersion]); // eslint-disable-line react-hooks/exhaustive-deps

    const debouncedOnMouseMove = useDebouncedCallback(
        (event) => {
            if (!onHoveredLineChangeRef.current) return;

            const view = viewRef.current;
            let newLine: number | null = null;
            if (view) {
                const line = view.state.doc.lineAt(
                    view.posAtCoords({ x: event.clientX, y: event.clientY }),
                ).number;
                if (line) {
                    newLine = line;
                }
            }

            if (selectedLineRef.current !== newLine) {
                selectedLineRef.current = newLine;
                onHoveredLineChangeRef.current?.(newLine);
            }
        },
        100,
        { leading: true, trailing: true },
    );

    return (
        <div
            ref={el}
            onMouseMove={debouncedOnMouseMove}
            className={clsx(styles.container, className)}
            data-tour={dataTour}
            style={
                {
                    "--cm-font-size": `${fontSize}px`,
                    "--cm-container-width": `${width}px`,
                } as CSSProperties
            }
        />
    );
}
