"use client";

import type { ReactNode } from "react";

import { useSelectedLayoutSegment } from "next/navigation";

import clsx from "clsx";

import GhostButton from "@/components/GhostButton";

export type Props = {
    segment: string;
    icon: ReactNode;
    label: ReactNode;
};

export default function NavItem({ segment, label, icon }: Props) {
    const isSelected = useSelectedLayoutSegment() === segment;

    return (
        <li className="grow text-center lg:text-left">
            <GhostButton
                href={`/settings/${segment}`}
                className={clsx("!px-3 block rounded-md py-2", {
                    "pointer-events-none bg-gray-3 font-medium": isSelected,
                })}
            >
                <span className="mr-2 opacity-50">{icon}</span>
                {label}
            </GhostButton>
        </li>
    );
}
