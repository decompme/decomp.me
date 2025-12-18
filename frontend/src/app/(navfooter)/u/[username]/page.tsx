import type { Metadata } from "next";

import { notFound } from "next/navigation";

import Profile from "@/components/user/Profile";
import { get } from "@/lib/api/request";
import type { ScratchUser } from "@/lib/api/types";

export async function generateMetadata(props: {
    params: Promise<{ username: string }>;
}): Promise<Metadata> {
    const params = await props.params;
    let user: ScratchUser;

    try {
        user = await get(`/users/${params.username}`);
    } catch (error) {
        console.error(error);
    }

    if (!user) {
        return notFound();
    }

    return {
        title: user.username,
        openGraph: {
            title: user.username,
            images: [`/u/${user.username}/opengraph-image`],
        },
    };
}

export default async function Page(props: {
    params: Promise<{ username: string }>;
}) {
    const params = await props.params;
    let user: ScratchUser;
    try {
        user = await get(`/users/${params.username}`);
    } catch (error) {
        console.error(error);
    }

    if (!user) {
        return notFound();
    }

    return <Profile user={user} />;
}
