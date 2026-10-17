"use client";

import type { ReactNode } from "react";

import Link from "@/components/Link";

import { useStats } from "@/lib/api";
import { STAT_DEFINITIONS } from "@/lib/stats";

function Stat({
    icon,
    value,
    label,
    href,
}: {
    icon: ReactNode;
    value: number;
    label: string;
    href?: string;
}) {
    const content = (
        <>
            <span className="inline-flex items-center gap-1 text-gray-12">
                {icon}
                {value.toLocaleString()}
            </span>
            <span>{label}</span>
        </>
    );

    if (href) {
        return (
            <Link
                href={href}
                className="inline-flex flex-col items-center gap-1.5 text-center hover:underline active:translate-y-px"
            >
                {content}
            </Link>
        );
    }

    return (
        <span className="inline-flex flex-col items-center gap-1.5 text-center">
            {content}
        </span>
    );
}

export default function SiteStats() {
    const stats = useStats();

    if (!stats) {
        return (
            <p
                className="inline-flex min-h-4 items-start gap-8 text-xs md:gap-16"
                aria-hidden="true"
            >
                {["w-32", "w-28", "w-36"].map((width) => (
                    <span
                        key={width}
                        className="inline-flex flex-col items-center gap-1.5"
                    >
                        <span className="inline-flex items-center gap-1">
                            <span className="size-4 animate-pulse rounded-full bg-[var(--g300)]" />
                            <span className="h-3 w-14 animate-pulse rounded-full bg-[var(--g300)]" />
                        </span>
                        <span
                            className={`h-3 ${width} animate-pulse rounded-full bg-[var(--g300)]`}
                        />
                    </span>
                ))}
            </p>
        );
    }

    return (
        <p className="inline-flex min-h-4 items-start gap-8 text-gray-11 text-xs md:gap-16">
            {STAT_DEFINITIONS.map(({ key, label, Icon }) => (
                <Stat
                    key={key}
                    icon={<Icon />}
                    value={stats[key]}
                    label={label}
                />
            ))}
        </p>
    );
}
