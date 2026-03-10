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

    let description = "There ";
    description += user.num_scratches === 1 ? "is " : "are ";
    description +=
        user.num_scratches === 0
            ? "currently no "
            : `${user.num_scratches.toLocaleString("en-US")} `;
    description += user.num_scratches === 1 ? "scratch " : "scratches ";
    description += "created by this user.";

    return {
        title: user.username,
        openGraph: {
            title: user.username,
            description: description,
            images: [`/u/${params.username}/opengraph-image`],
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
