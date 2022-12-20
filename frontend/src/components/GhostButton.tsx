import { ReactNode } from "react"

import Link from "next/link"

export type Props = {
    href?: string
    children: ReactNode
}

export default function GhostButton({ children, href }: Props) {
    const className = "rounded bg-black/0 px-2 py-1 text-sm transition-colors hover:bg-black/5 active:translate-y-px dark:bg-white/0 dark:hover:bg-white/5"

    if (href) {
        return <Link href={href} className={className}>
            {children}
        </Link>
    }

    return <button className={className}>
        {children}
    </button>
}
