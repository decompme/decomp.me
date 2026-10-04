"use client";

import useSWR from "swr";
import { ScratchItemNoOwner } from "@/components/ScratchItem";
import ScratchList from "@/components/ScratchList";
import { get } from "@/lib/api/request";
import type { AnonymousUser } from "@/lib/api/types";
import UserAvatar from "./UserAvatar";

type AnonymousScratchUser = AnonymousUser & {
    num_scratches: number;
    num_presets: number;
};

export default function AnonymousProfile({ id }: { id: string }) {
    const { data: user, error } = useSWR<AnonymousScratchUser>(
        `/users/anonymous/${id}`,
        get,
    );

    if (error) {
        throw error;
    }

    if (!user) {
        return <div className="mx-auto w-full max-w-3xl p-4">Loading...</div>;
    }

    return (
        <div className="mx-auto w-full max-w-3xl p-4">
            <header className="flex flex-col items-center gap-6 pt-4 md:flex-row">
                <UserAvatar className="size-16" user={user} />
                <div>
                    <h1 className="text-center font-medium text-2xl tracking-tight md:text-left">
                        {user.username}
                    </h1>
                </div>
            </header>
            <section className="mt-4">
                <div className="mb-2 font-medium text-lg tracking-tight">
                    Scratches ({user.num_scratches.toLocaleString("en-US")})
                </div>
                <ScratchList
                    url={`/users/anonymous/${id}/scratches?page_size=20`}
                    item={ScratchItemNoOwner}
                    isSortable={true}
                    showDeleteButtons={true}
                />
            </section>
        </div>
    );
}
