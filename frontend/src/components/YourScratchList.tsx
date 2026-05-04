"use client";

import Link from "next/link";

import { useThisUser, isAnonUser } from "@/lib/api";

import Button from "./Button";
import ScratchList, { type Props as ScratchListProps } from "./ScratchList";

export type Props = Omit<ScratchListProps, "url">;

export default function YourScratchList(props: Props) {
    const user = useThisUser();
    const emptyButtonLabel =
        props.emptyButtonLabel ?? "Create your first scratch";

    if (!user) {
        return null;
    }

    if (isAnonUser(user) && user.is_ephemeral) {
        return (
            <Link href="/new">
                <Button>{emptyButtonLabel}</Button>
            </Link>
        );
    }

    const url = isAnonUser(user)
        ? "/user/scratches?page_size=20" // Using this url all the time results in stale data if you log out
        : `/users/${user.username}/scratches?page_size=20`;

    return (
        <ScratchList {...props} url={url} emptyButtonLabel={emptyButtonLabel} />
    );
}
