"use client"

import Link from "next/link"

import { ArrowRightIcon } from "@primer/octicons-react"

import Button from "@/components/Button"
import GhostButton from "@/components/GhostButton"
import GitHubLoginButton from "@/components/GitHubLoginButton"
import { useStats, useThisUser } from "@/lib/api"

export const SITE_DESCRIPTION = "decomp.me is a collaborative online space where you can contribute to ongoing decompilation projects."

/** Two-column component of a welcoming message and site stats. */
export default function WelcomeInfo() {
    const stats = useStats()
    const user = useThisUser()

    return <div className="flex flex-col gap-4 sm:flex-row">
        <div className="grow">
            <h1 className="text-2xl text-gray-8 dark:text-gray-2">
                Welcome to <span className="font-semibold">decomp.me</span>
            </h1>
            <p className="max-w-md py-3 text-base leading-tight text-gray-6 dark:text-gray-5">
                {SITE_DESCRIPTION}
            </p>
            <div className="flex items-center gap-2 text-sm">
                {user?.is_anonymous && <GitHubLoginButton popup />}
                <Link href="/new">
                    <Button primary>
                        Start decomping
                        <ArrowRightIcon />
                    </Button>
                </Link>
                <GhostButton href="/projects">
                    Browse projects
                </GhostButton>
            </div>
        </div>
        {stats && <p className="text-sm text-gray-6 sm:self-center">
            {stats.scratch_count.toLocaleString()} scratches created<br />
            {stats.profile_count.toLocaleString()} unique visitors<br />
            {stats.github_user_count.toLocaleString()} users signed up<br />
            {stats.asm_count.toLocaleString()} asm globs submitted
        </p>}
    </div>
}