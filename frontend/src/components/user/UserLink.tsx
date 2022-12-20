import { isAnonUser, User, AnonymousUser } from "../../lib/api/types"
import GhostButton from "../GhostButton"

import UserAvatar from "./UserAvatar"

export function GitHubUserLink({ user }: { user: { login: string } }) {
    return (
        <GhostButton href={`https://github.com/${user.login}`}>
            <span>{user.login}</span>
        </GhostButton>
    )
}

export type Props = {
    user: User | AnonymousUser
    showUsername?: boolean // default = true
}

export default function UserLink({ user, showUsername }: Props) {
    const url: string | null = isAnonUser(user) ? null : `/u/${user.username}`

    return <GhostButton href={url} className="rounded-full">
        <UserAvatar user={user} className="mr-1 h-4 w-4 align-middle" />
        {showUsername != false && <span>
            {user.username}
        </span>}
    </GhostButton>
}
