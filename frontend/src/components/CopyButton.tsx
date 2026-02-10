import { useState } from "react";
import clsx from "clsx";
import { CopyIcon } from "@primer/octicons-react";

interface CopyButtonProps {
    text: string | (() => string | Promise<string>);
    title?: string;
    size?: number;
    className?: string;
}

export default function CopyButton({
    text,
    title = "Copy",
    size = 16,
    className = "",
}: CopyButtonProps) {
    const [copied, setCopied] = useState(false);
    const [fade, setFade] = useState(false);

    const handleCopy = async () => {
        try {
            const value =
                typeof text === "function"
                    ? await Promise.resolve(text())
                    : text;

            if (typeof value !== "string") {
                throw new Error("CopyButton: text must resolve to a string");
            }

            await navigator.clipboard.writeText(value);
            setCopied(true);
            setFade(false);
            setTimeout(() => setFade(true), 1000);
            setTimeout(() => setCopied(false), 1500); // matches 0.5s transition
        } catch (err) {
            console.error("Failed to copy text to clipboard:", err);
        }
    };

    return (
        <>
            <button
                className={clsx(
                    "cursor-pointer rounded p-[0.5em] text-[var(--g1500)] hover:bg-[var(--g400)]",
                    className,
                )}
                aria-label={title}
                title={title}
                onClick={handleCopy}
            >
                <CopyIcon size={size} />
            </button>

            {copied && (
                <span
                    className={clsx(
                        "rounded px-2 py-1",
                        "bg-[var(--accent)] text-[#eee] text-[0.9em]",
                        "opacity-100 transition-opacity duration-500 ease-in-out",
                        fade && "opacity-0",
                    )}
                >
                    Copied!
                </span>
            )}
        </>
    );
}
