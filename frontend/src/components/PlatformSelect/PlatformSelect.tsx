import { useEffect, useRef, useState } from "react";

import { PlatformIcon } from "./PlatformIcon";
import { useMediaQuery } from "@/lib/hooks";

import clsx from "clsx";

export type Props = {
    platforms: {
        [key: string]: {
            name: string;
            description: string;
        };
    };
    value: string;
    className?: string;
    onChange: (value: string) => void;
};

function PlatformList({
    platforms,
    value,
    onChange,
    size = "8",
}: {
    platforms: Props["platforms"];
    value: string;
    onChange: (key: string) => void;
    size?: string;
}) {
    return Object.entries(platforms).map(([key, platform]) => {
        const isSelected = value === key;

        return (
            <li
                key={key}
                onClick={() => onChange(key)}
                className={clsx(
                    "flex cursor-pointer select-none items-center gap-3 rounded-md p-3 transition-colors",
                    "border hover:border-[var(--g400)] hover:text-[var(--g2000)]",
                    "group",
                    isSelected
                        ? "border-[var(--g400)] bg-[var(--g300)] text-[var(--g2000)]"
                        : "border-transparent bg-transparent text-var(--g1200)",
                )}
            >
                <PlatformIcon
                    clickable={false}
                    platform={key}
                    className={clsx(
                        `h-${size}`,
                        `w-${size}`,
                        "filter transition-filter duration-200",
                        "grayscale",
                        "group-hover:grayscale-0",
                        isSelected && "grayscale-0",
                    )}
                />
                <div className="flex flex-col gap-1">
                    <div className="font-medium">{platform.name}</div>
                    <div className="text-xs opacity-60">
                        {platform.description}
                    </div>
                </div>
            </li>
        );
    });
}

function PlatformSelectGrid({ platforms, value, onChange, className }: Props) {
    return (
        <ul
            className={clsx(
                "grid list-none grid-cols-2 gap-2 md:grid-cols-3",
                className,
            )}
        >
            <PlatformList
                platforms={platforms}
                value={value}
                onChange={onChange}
                size="10"
            />
        </ul>
    );
}

function PlatformSelectDropdown({
    platforms,
    value,
    onChange,
    className,
}: Props) {
    const [open, setOpen] = useState(false);
    const selected = platforms[value];
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handlePointerDown(e: PointerEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        }

        if (open) {
            document.addEventListener("pointerdown", handlePointerDown);
        }

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [open]);

    return (
        <div
            ref={dropdownRef}
            className={clsx(
                "relative inline-block w-full text-left",
                className,
            )}
        >
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={clsx(
                    "flex w-full items-center justify-between gap-2 rounded-md p-3 transition-colors",
                    "border border-[var(--g400)] bg-[var(--g300)] text-[var(--g2000)] hover:border-[var(--g500)]",
                )}
            >
                <div className="flex items-center gap-3">
                    {selected ? (
                        <>
                            <PlatformIcon
                                platform={value}
                                clickable={false}
                                className="h-6 w-6"
                            />
                            <span className="font-medium">{selected.name}</span>
                        </>
                    ) : (
                        <div className="h-6 w-6 animate-pulse rounded-full bg-[var(--g400)]" />
                    )}
                </div>
                <span className="text-[var(--g800)]">▾</span>
            </button>

            {open && (
                <ul
                    className={clsx(
                        "absolute z-50 mt-2 max-h-[50vh] w-full overflow-y-auto rounded-md",
                        "border border-[var(--g400)]",
                        "bg-[var(--g200)] p-1 shadow-lg",
                    )}
                >
                    <PlatformList
                        platforms={platforms}
                        value={value}
                        onChange={(key) => {
                            onChange(key);
                            setOpen(false);
                        }}
                    />
                </ul>
            )}
        </div>
    );
}

export default function PlatformSelect({
    platforms,
    value,
    onChange,
    className,
}: Props) {
    // NOTE: The GBA icon gradient disappears if both elements are mounted with
    // one element set to be hidden, so render the components conditionally.
    const isSmallScreen = useMediaQuery("(max-width: 640px)");

    return typeof isSmallScreen === "undefined" ? (
        <div className="h-12 w-full animate-pulse rounded border border-[var(--g400)] bg-[var(--g200)] p-3">
            Loading...
        </div>
    ) : isSmallScreen ? (
        <PlatformSelectDropdown
            platforms={platforms}
            value={value}
            onChange={onChange}
            className={className}
        />
    ) : (
        <PlatformSelectGrid
            platforms={platforms}
            value={value}
            onChange={onChange}
            className={className}
        />
    );
}
