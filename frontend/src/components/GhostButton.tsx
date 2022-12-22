import { ReactNode } from "react"

import Link from "next/link"

import classNames from "classnames"

export type Props = {
    href?: string
    children: ReactNode
    className?: string
}

export default function GhostButton({ children, href, className }: Props) {
    const isClickable = !!href
    const cn = classNames(className, {
        "rounded bg-transparent px-2 py-1 text-sm whitespace-nowrap": true,
        "transition-colors hover:bg-gray-3 cursor-pointer active:translate-y-px hover:text-gray-12": isClickable,
    })

    if (href) {
        return <Link href={href} className={cn}>
            {children}
        </Link>
    }

    return <button className={cn}>
        {children}
    </button>
}
