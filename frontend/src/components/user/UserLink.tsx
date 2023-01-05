import Link from "next/link"

import { isAnonUser, User, AnonymousUser } from "@/lib/api/types"

import UserAvatar from "./UserAvatar"

export type Props = {
    user: User | AnonymousUser
    showUsername?: boolean // default = true
}

export default function UserLink({ user, showUsername }: Props) {
    if (!user) {
        return null
    }

    const url: string | null = isAnonUser(user) ? null : `/u/${user.username}`

    const inner = <>
        <UserAvatar user={user} className="mr-1 h-4 w-4 align-middle" />
        {showUsername != false && <span>
            {user.username}
        </span>}
    </>

    if (!url) {
        return <span>{inner}</span>
    }

    return <Link href={url} className="hover:underline active:translate-y-px">
        {inner}
    </Link>
}
