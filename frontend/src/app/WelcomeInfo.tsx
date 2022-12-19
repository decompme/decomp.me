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

    return <div className="flex flex-col sm:flex-row gap-4 text-gray-400">
        <div className="flex-grow">
            <h1 className="text-xl text-white">
                Welcome to <span className="font-semibold">decomp.me</span>
            </h1>
            <p className="text-base max-w-md leading-tight py-3">
                {SITE_DESCRIPTION}
            </p>
            <div className="flex gap-2">
                {user?.is_anonymous && <GitHubLoginButton popup />}
                <Link href="/new">
                    <Button primary>
                        Start decomping
                        <ArrowRightIcon />
                    </Button>
                </Link>
            </div>
        </div>
        {stats && <p className="text-sm sm:self-center">
            {stats.scratch_count.toLocaleString()} scratches created<br />
            {stats.profile_count.toLocaleString()} unique visitors<br />
            {stats.github_user_count.toLocaleString()} users signed up<br />
            {stats.asm_count.toLocaleString()} asm globs submitted
        </p>}
    </div>
}
