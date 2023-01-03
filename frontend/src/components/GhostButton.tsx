import { ReactNode } from "react"

import Link from "next/link"

import classNames from "classnames"

export type Props = {
    href?: string
    onClick?: () => void
    children: ReactNode
    className?: string
}

export default function GhostButton({ children, href, onClick, className }: Props) {
    const isClickable = !!(href || onClick)
    const cn = classNames(className, {
        "rounded bg-transparent px-2 py-1 text-sm whitespace-nowrap": true,
        "transition-colors hover:bg-gray-3 cursor-pointer active:translate-y-px hover:text-gray-12": isClickable,
    })

    if (href) {
        return <Link href={href} className={cn} onClick={onClick}>
            {children}
        </Link>
    }

    return <button className={cn} onClick={onClick}>
        {children}
    </button>
}
