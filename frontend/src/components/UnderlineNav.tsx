import { ReactNode } from "react"

import Link from "next/link"
import { useRouter } from "next/router"

import styles from "./UnderlineNav.module.scss"

export function Counter({ children }: { children: ReactNode }) {
    return <span className={styles.counter}>{children}</span>
}

export interface LinkConfig {
    href: string
    label: ReactNode
    selected?: boolean
    shallow?: boolean
}

export interface Props {
    links: LinkConfig[]
    maxWidth?: string
}

export default function UnderlineNav({ links, maxWidth }: Props) {
    const router = useRouter()

    return <nav className={styles.container}>
        <ul style={{ maxWidth }}>
            {links.filter(Boolean).map(({ href, label, selected, shallow }) => {
                const isSelected = selected || router.asPath === href

                return <li key={href} data-selected={isSelected}>
                    <Link href={href} shallow={shallow}>
                        <a>{label}</a>
                    </Link>
                </li>
            })}
        </ul>
    </nav>
}
