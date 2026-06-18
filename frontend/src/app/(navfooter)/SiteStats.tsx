"use client";

import type { ReactNode } from "react";

import Link from "@/components/Link";

import { useStats } from "@/lib/api";

function Stat({ children, href }: { children: ReactNode; href?: string }) {
    if (href) {
        return (
            <Link href={href} className="hover:underline active:translate-y-px">
                {children}
            </Link>
        );
    }

    return <span>{children}</span>;
}

export default function SiteStats() {
    const stats = useStats();

    if (!stats) {
        return (
            <p
                className="inline-flex min-h-4 gap-8 text-xs md:gap-16"
                aria-hidden="true"
            >
                <span className="h-4 w-32 animate-pulse rounded-full bg-[var(--g300)]" />
                <span className="h-4 w-28 animate-pulse rounded-full bg-[var(--g300)]" />
                <span className="h-4 w-36 animate-pulse rounded-full bg-[var(--g300)]" />
            </p>
        );
    }

    return (
        <p className="inline-flex min-h-4 gap-8 text-gray-11 text-xs md:gap-16">
            <Stat>
                {stats.scratch_count.toLocaleString()} scratches created
            </Stat>
            <Stat>
                {stats.github_user_count.toLocaleString()} users signed up
            </Stat>
            <Stat>{stats.asm_count.toLocaleString()} asm globs submitted</Stat>
        </p>
    );
}
