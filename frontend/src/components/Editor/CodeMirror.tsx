import {
    type CSSProperties,
    type MutableRefObject,
    useCallback,
    useEffect,
    useRef,
} from "react";

import { type Extension, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import classNames from "classnames";
import { useDebouncedCallback } from "use-debounce";

import { useSize } from "@/lib/hooks";
import { useCodeFontSize } from "@/lib/settings";

import styles from "./CodeMirror.module.scss";

// useDebouncedCallback is a bit dodgy when both leading and trailing are true, so here's a reimplementation
function useLeadingTrailingDebounceCallback(
    callback: () => void,
    delay: number,
) {
    const timeout = useRef<any>();

    return useCallback(() => {
        if (timeout.current) {
            clearTimeout(timeout.current);
        } else {
            // Leading
            callback();
        }

        timeout.current = setTimeout(() => {
            timeout.current = undefined;

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
    viewRef?: MutableRefObject<EditorView | null>;
    readOnly?: boolean;
    extensions: Extension; // const
}

export default function CodeMirror({
    value,
    valueVersion,
    onChange,
    onHoveredLineChange,
    onSelectedLineChange,
    className,
    viewRef: viewRefProp,
    readOnly,
    extensions,
}: Props) {
    const { ref: el, width } = useSize<HTMLDivElement>();

    const valueRef = useRef(value);
    valueRef.current = value;

    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const viewRef = useRef<EditorView>();

    const extensionsRef = useRef(extensions);
    extensionsRef.current = extensions;

    const selectedLineRef = useRef<number>();
    const hoveredLineRef = useRef<number>();

    const onHoveredLineChangeRef = useRef(onHoveredLineChange);
    onHoveredLineChangeRef.current = onHoveredLineChange;

    const onSelectedLineChangeRef = useRef(onSelectedLineChange);
    onSelectedLineChangeRef.current = onSelectedLineChange;

    const [fontSize] = useCodeFontSize();

    // Defer calls to onChange to avoid excessive re-renders
    const propagateValue = useLeadingTrailingDebounceCallback(() => {
        onChangeRef.current?.(viewRef.current.state.doc.toString());
    }, 100);

    // Initial view creation
    useEffect(() => {
        viewRef.current = new EditorView({
            state: EditorState.create({
                doc: valueRef.current,
                extensions: [
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
                                requestAnimationFrame(() => {
                                    onSelectedLineChangeRef.current?.(line);
                                });
                            }

                            return null;
                        },
                    ),

                    readOnly ? EditorState.readOnly.of(true) : [],

                    extensionsRef.current,
                ],
            }),
            parent: el.current,
        });

        if (viewRefProp) viewRefProp.current = viewRef.current;

        return () => {
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
            className={classNames(styles.container, className)}
            style={
                {
                    "--cm-font-size": `${fontSize}px`,
                    "--cm-container-width": `${width}px`,
                } as CSSProperties
            }
        />
    );
}
