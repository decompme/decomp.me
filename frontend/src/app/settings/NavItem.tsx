"use client"

import { ReactNode } from "react"

import { useSelectedLayoutSegment } from "next/navigation"

import classNames from "classnames"

import GhostButton from "../../components/GhostButton"

export type Props = {
    segment: string
    icon: ReactNode
    label: ReactNode
}

export default function NavItem({ segment, label, icon }: Props) {
    const isSelected = useSelectedLayoutSegment() === segment

    return <li className="grow text-center lg:text-left">
        <GhostButton
            href={`/settings/${segment}`}
            className={classNames({
                "!px-3 py-2 block rounded-md": true,
                "!text-black dark:!text-white bg-black/5 dark:bg-white/5 font-medium": isSelected,
            })}
        >
            <span className="mr-2 opacity-50">{icon}</span>
            {label}
        </GhostButton>
    </li>
}
