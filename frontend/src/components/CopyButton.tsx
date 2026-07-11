import { useEffect, useRef, useState } from "react";
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
    className,
}: CopyButtonProps) {
    const [copied, setCopied] = useState(false);
    const [fade, setFade] = useState(false);

    const fadeTimeoutRef = useRef<number | null>(null);
    const resetTimeoutRef = useRef<number | null>(null);

    const popup_lifetime_ms = 1200;
    const popup_fade_duration_ms = 500;

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

            if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
            if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);

            fadeTimeoutRef.current = window.setTimeout(
                () => setFade(true),
                popup_lifetime_ms,
            );
            resetTimeoutRef.current = window.setTimeout(
                () => setCopied(false),
                popup_lifetime_ms + popup_fade_duration_ms,
            );
        } catch (err) {
            console.error("Failed to copy text to clipboard:", err);
        }
    };

    // cleanup
    useEffect(() => {
        return () => {
            if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
            if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
        };
    }, []);

    return (
        <div className="relative inline-block">
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
                        `transition-opacity duration-${popup_fade_duration_ms} ease-in`,
                        fade ? "opacity-5" : "opacity-100",
                    )}
                >
                    Copied!
                </span>
            )}
        </div>
    );
}
