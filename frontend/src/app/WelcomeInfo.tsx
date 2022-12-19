"use client"

import { ArrowRightIcon } from "@primer/octicons-react"
import Link from "next/link"
import Button from "../components/Button"
import GitHubLoginButton from "../components/GitHubLoginButton"
import { useStats, useThisUser } from "../lib/api"

export const SITE_DESCRIPTION = "decomp.me is a collaborative online space where you can contribute to ongoing decompilation projects."

/** Two-column component of a welcoming message and site stats. */
export default function WelcomeInfo() {
    const stats = useStats()
    const user = useThisUser()

    return <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-grow">
            <h1 className="text-2xl text-gray-8 dark:text-gray-1">
                Welcome to <span className="font-semibold">decomp.me</span>
            </h1>
            <p className="text-base max-w-md leading-tight py-3 text-gray-7 dark:text-gray-3">
                {SITE_DESCRIPTION}
            </p>
            <div className="flex gap-2 text-sm">
                {user?.is_anonymous && <GitHubLoginButton popup />}
                <Link href="/new">
                    <Button primary>
                        Start decomping
                        <ArrowRightIcon />
                    </Button>
                </Link>
                <Link href="/projects" className="text-gray-6 dark:text-gray-4 hover:text-gray-8 hover:underline active:translate-y-px self-center px-2">
                    Browse projects
                </Link>
            </div>
        </div>
        {stats && <p className="text-sm sm:self-center text-gray-6 dark:text-gray-5">
            {stats.scratch_count.toLocaleString()} scratches created<br />
            {stats.profile_count.toLocaleString()} unique visitors<br />
            {stats.github_user_count.toLocaleString()} users signed up<br />
            {stats.asm_count.toLocaleString()} asm globs submitted
        </p>}
    </div>
}
