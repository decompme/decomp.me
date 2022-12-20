import Link from "next/link"

import { User, AnonymousUser, isAnonUser } from "../../lib/api/types"

type GithubUser = {
    login: string
}

export type Props = {
    user: User | AnonymousUser | GithubUser
}

export function getUserName(user: User | AnonymousUser | GithubUser): string {
    if ("login" in user) {
        return user.login
    }

    return user.username
}

export function getUserHtmlUrl(user: User | AnonymousUser | GithubUser): string | null {
    if ("login" in user) {
        return `https://github.com/${user.login}`
    }

    if (isAnonUser(user)) {
        return null
    }

    return `/u/${user.username}`
}

/** A mention of a user, like @username, that can be clicked on. */
export default function UserMention({ user }: Props) {
    return <Link href={getUserHtmlUrl(user)} className="text-gray-6 hover:text-gray-8 dark:text-gray-5 hover:dark:text-gray-3">
        <span className="text-gray-5 dark:text-gray-6">@</span>
        <span className="font-medium">{getUserName(user)}</span>
    </Link>
}
