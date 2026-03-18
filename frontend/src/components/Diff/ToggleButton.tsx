import clsx from "clsx";

type ToggleButtonProps = {
    label: string;
    enabled: boolean;
    setEnabled: (enabled: boolean) => void;
    title?: string;
};

export default function ToggleButton({
    label,
    enabled,
    setEnabled,
    title,
}: ToggleButtonProps) {
    return (
        <button
            onClick={() => {
                setEnabled(!enabled);
            }}
            aria-pressed={enabled}
            title={`${enabled ? "Hide " : "Show "}${title}`}
            className={clsx(
                "px-2 py-1",
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
