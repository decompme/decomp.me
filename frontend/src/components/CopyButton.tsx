import { useState } from "react";
import clsx from "clsx";
import { CopyIcon } from "@primer/octicons-react";

import styles from "./CopyButton.module.scss";

export default function CopyButton({
    title = "Copy",
    text,
}: { title?: string; text: string | (() => string | Promise<string>) }) {
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
            setTimeout(() => setCopied(false), 1500); // 0.5s css transition
        } catch (err) {
            console.error("Failed to copy text to clipboard: ", err);
        }
    };

    return (
        <>
            <button
                className={styles.button}
                title={title}
                onClick={handleCopy}
            >
                <CopyIcon />
            </button>
            {copied && (
                <span className={clsx(styles.copied, fade && styles.faded)}>
                    Copied!
                </span>
            )}
        </>
    );
}
