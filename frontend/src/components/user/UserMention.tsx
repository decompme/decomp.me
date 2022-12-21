import Link from "next/link"

import { User, AnonymousUser, isAnonUser } from "../../lib/api/types"

export type GithubUser = {
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

export function isMentionable(user: User | AnonymousUser | GithubUser): boolean {
    if ("login" in user) {
        return false
    }

    return !isAnonUser(user)
}

/** A mention of a user, like @username, that can be clicked on. */
export default function UserMention({ user }: Props) {
    const url = getUserHtmlUrl(user)

    const children = <>
        {isMentionable(user) && <span className="text-gray-5 dark:text-gray-6">@</span>}
        <span className="font-medium">{getUserName(user)}</span>
    </>

    if (url) {
        return <Link
            href={getUserHtmlUrl(user)}
            className="text-gray-6 hover:text-gray-8 dark:text-gray-5 hover:dark:text-gray-3"
        >
            {children}
        </Link>
    } else {
        return <span className="text-gray-6 dark:text-gray-5">{children}</span>
    }
}
