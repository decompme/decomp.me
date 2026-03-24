import type { JSX } from "react";
import clsx from "clsx";

type ToggleButtonProps = {
    label: string | JSX.Element;
    enabled: boolean;
    setEnabled: (enabled: boolean) => void;
    title?: string;
    disabledLabel?: string;
    enabledLabel?: string;
    padding?: string;
};

export default function ToggleButton({
    label,
    enabled,
    setEnabled,
    title,
    disabledLabel = "Show ",
    enabledLabel = "Hide ",
    padding = "px-2 py-1",
}: ToggleButtonProps) {
    return (
        <button
            onClick={() => {
                setEnabled(!enabled);
            }}
            aria-pressed={enabled}
            title={
                title
                    ? `${enabled ? enabledLabel : disabledLabel}${title}`
                    : undefined
            }
            className={clsx(
                padding,
                "text-md",
                "rounded-md border",
                "transition-all duration-150",
                "flex items-center justify-center",
                "select-none",
                "border-[var(--g700)]",
                enabled
                    ? "bg-[var(--g500)] text-[var(--g1300)] hover:bg-[var(--g400)]"
                    : "bg-transparent text-[var(--g1300)] hover:bg-[var(--g400)]",
            )}
        >
            {label}
        </button>
    );
}
