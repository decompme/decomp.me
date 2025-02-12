"use client";

import type { ReactNode } from "react";

import Link from "next/link";

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
        return null;
    }

    return (
        <p className="inline-flex gap-8 text-gray-11 text-xs md:gap-16">
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
