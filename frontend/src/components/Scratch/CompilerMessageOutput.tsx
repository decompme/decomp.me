import { type RefObject, useContext } from "react";

import type { EditorView } from "@codemirror/view";
import Ansi from "ansi-to-react";

import { scrollToLineNumber } from "@/lib/codemirror/scrollToLineNumber";

import { ScrollContext } from "../ScrollContext";

import { parseCompilerMessages } from "./compilerMessages";

export default function CompilerMessageOutput({
    text,
}: {
    text?: string | null;
}) {
    const sourceEditor = useContext<RefObject<EditorView>>(ScrollContext);
    const parts = parseCompilerMessages(text);

    return (
        <>
            {parts.map((part, index) => {
                if (part.type === "sourceLine") {
                    return (
                        <button
                            className="inline cursor-pointer border-0 bg-transparent p-0 align-baseline font-mono text-blue-11 text-xs underline decoration-dotted underline-offset-2 hover:text-blue-12"
                            key={index}
                            type="button"
                            onClick={() =>
                                scrollToLineNumber(sourceEditor, part.line, {
                                    select: true,
                                })
                            }
                        >
                            <Ansi>{part.text}</Ansi>
                        </button>
                    );
                }

                return <Ansi key={index}>{part.text}</Ansi>;
            })}
        </>
    );
}
