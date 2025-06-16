import Link from "next/link";

import { isAnonUser, type User, type AnonymousUser } from "@/lib/api/types";

import UserAvatar from "./UserAvatar";

export type Props = {
    user: User | AnonymousUser;
    showUsername?: boolean; // default = true
};

export default function UserLink({ user, showUsername }: Props) {
    if (!user) {
        return <span>?</span>;
    }

    const url: string | null = isAnonUser(user) ? null : `/u/${user.username}`;

    const inner = (
        <>
            <UserAvatar user={user} className="mr-1 size-4 align-middle" />
            {showUsername !== false && <span>{user.username}</span>}
        </>
    );

    if (!url) {
        return <span>{inner}</span>;
    }

    return (
        <Link
            href={url}
            prefetch={false}
            className="hover:underline active:translate-y-px"
        >
            {inner}
        </Link>
    );
}
