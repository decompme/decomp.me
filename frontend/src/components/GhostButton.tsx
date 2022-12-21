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
        "rounded bg-black/0 px-2 py-1 text-sm dark:bg-white/0 whitespace-nowrap": true,
        "transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:translate-y-px hover:text-gray-7 dark:hover:text-gray-2": isClickable,
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
