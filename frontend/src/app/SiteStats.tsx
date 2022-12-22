"use client"

import { ReactNode } from "react"

import { useStats } from "@/lib/api"

function Stat({ children }: { children: ReactNode }) {
    return <span>
        {children}
    </span>
}

export default function SiteStats() {
    const stats = useStats()

    if (!stats) {
        return null
    }

    return <p className="inline-flex gap-8 text-xs text-gray-11 md:gap-16">
        <Stat>{stats.scratch_count.toLocaleString()} scratches created</Stat>
        <Stat>{stats.profile_count.toLocaleString()} unique visitors</Stat>
        <Stat>{stats.github_user_count.toLocaleString()} users signed up</Stat>
        <Stat>{stats.asm_count.toLocaleString()} asm globs submitted</Stat>
    </p>
}
