import { LinkExternalIcon } from "@primer/octicons-react"

import GhostButton from "@/components/GhostButton"
import UserAvatar from "@/components/user/UserAvatar"
import UserMention, { type GithubUser, getUserName } from "@/components/user/UserMention"
import { get } from "@/lib/api/request"
import type { User } from "@/lib/api/types"

export type Contributor = User | GithubUser

/** Gets the list of contributor usernames for the repo from GitHub. */
export async function getContributorUsernames(): Promise<string[]> {
    const req = await fetch("https://api.github.com/repos/decompme/decomp.me/contributors?page_size=100", {
        cache: "force-cache",
    })

    if (!req.ok) {
        console.warn("failed to fetch contributors:", await req.text())
        return ["ethteck", "nanaian"]
    }

    const contributors = await req.json()
    contributors.sort((a: any, b: any) => b.contributions - a.contributions)
    return contributors.map((contributor: any) => contributor.login)
}

export async function usernameToContributor(username: string): Promise<Contributor> {
    try {
        // Try and get decomp.me information if they have an account
        const user: User = await get(`/users/${username}`)
        return user
    } catch (error) {
        // Fall back to GitHub information
        return { login: username }
    }
}

export function ContributorItem({ contributor }: { contributor: Contributor }) {
    return <li className="flex items-center p-2 md:w-1/3">
        {!("login" in contributor) && <UserAvatar user={contributor} className="mr-1.5 size-6" />}
        <UserMention user={contributor} />
    </li>
}

export default function ContributorsList({ contributors }: { contributors: Contributor[] }) {
    if (!contributors.length) {
        return null
    }

    return <div className="py-4">
        <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-medium tracking-tight text-gray-12 md:text-2xl">
                Contributors
            </h3>
            <GhostButton href="https://github.com/decompme/decomp.me/graphs/contributors">
                View on GitHub <LinkExternalIcon />
            </GhostButton>
        </div>
        <ul className="flex flex-wrap">
            {contributors.map(contributor => <ContributorItem key={getUserName(contributor)} contributor={contributor} />)}
        </ul>
    </div>
}
