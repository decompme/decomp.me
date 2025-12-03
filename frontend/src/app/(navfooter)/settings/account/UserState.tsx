"use client";

import GitHubLoginButton from "@/components/GitHubLoginButton";
import LoadingSpinner from "@/components/loading.svg";
import UserAvatar from "@/components/user/UserAvatar";
import UserMention from "@/components/user/UserMention";
import { isAnonUser, useThisUser } from "@/lib/api";

import SignOutButton from "./SignOutButton";

export default function UserState() {
    const user = useThisUser();

    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div>
                <UserAvatar user={user} className="size-16" />
            </div>
            {user ? (
                <div>
                    <p>
                        {isAnonUser(user) ? "You appear as" : "Signed in as"}{" "}
                        <UserMention user={user} />
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                        {isAnonUser(user) && <GitHubLoginButton />}
                        <SignOutButton />
                    </div>
                </div>
            ) : (
                <div className="flex animate-pulse items-center gap-2">
                    <LoadingSpinner className="size-6" />
                    <span>Loading...</span>
                </div>
            )}
        </div>
    );
}
