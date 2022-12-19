import { ReactNode, useRef } from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"

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
    const ref = useRef<HTMLDivElement>()

    // When a shallow route change is made, we need to scroll up to whereever this component is.
    const onClickShallow = () => {
        if (ref.current) {
            // Temporarily remove position:sticky so we can get its normal position.
            ref.current.style.position = "initial"
            requestAnimationFrame(() => {
                const { offsetTop } = ref.current

                // Only scroll up, not down.
                if (offsetTop < window.scrollY) {
                    window.scroll({ top: offsetTop })
                }

                ref.current.style.position = "sticky"
            })
        }
    }

    return (
        <nav ref={ref} className={styles.container}>
            <ul style={{ maxWidth }}>
                {links.filter(Boolean).map(({ href, label, selected, shallow }) => {
                    const isSelected = selected || router.asPath === href

                    return (
                        <li key={href} data-selected={isSelected}>
                            <Link href={href} shallow={shallow} onClick={shallow && onClickShallow}>
                                {label}
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </nav>
    )
}
