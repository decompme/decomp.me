import { type ReactNode, useState } from "react";

import { XIcon } from "@primer/octicons-react";
import clsx from "clsx";

import styles from "./DismissableBanner.module.scss";

export default function DismissableBanner({
    className,
    children,
    color = "#4273e1",
}: { className?: string; children?: ReactNode; color: string }) {
    const [isOpen, setIsOpen] = useState(true);

    if (!isOpen) return null;

    return (
        <div
            className={clsx(styles.container, className)}
            style={{ backgroundColor: color }}
        >
            <div className={styles.content}>{children}</div>
            <button
                title="Dismiss"
                className={styles.dismiss}
                onClick={() => setIsOpen(false)}
            >
                <XIcon />
            </button>
        </div>
    );
}
