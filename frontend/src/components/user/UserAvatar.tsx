"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

import clsx from "clsx";

import * as api from "@/lib/api";
import { userAvatarUrl } from "@/lib/api/urls";

import AnonymousFrogAvatar from "./AnonymousFrog";
import styles from "./UserAvatar.module.scss";

export type Props = {
    user: api.User | api.AnonymousUser | undefined;
    className?: string;
};

export default function UserAvatar({ user, className }: Props) {
    const userIsYou = api.useUserIsYou();

    // Avoid hydration mismatch
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    if (!user) {
        // Skeleton loading state
        return (
            <span className={clsx(styles.avatar, className)}>
                <div className="size-full animate-pulse rounded-full bg-gray-6" />
            </span>
        );
    }

    return (
        <span className={clsx(styles.avatar, className)}>
            {api.isAnonUser(user) ? (
                <AnonymousFrogAvatar user={user} />
            ) : (
                userAvatarUrl(user) && (
                    <Image src={userAvatarUrl(user)} alt="" fill sizes="64px" />
                )
            )}
            {isMounted && !userIsYou(user) && user.is_online && (
                <div className={styles.online} title="Online" />
            )}
        </span>
    );
}
