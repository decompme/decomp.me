"use client";

import { use } from "react";

import AnonymousProfile from "@/components/user/AnonymousProfile";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <AnonymousProfile id={id} />;
}
