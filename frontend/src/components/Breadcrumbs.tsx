import { ReactNode } from "react"

import Link from "next/link"

import classNames from "classnames"

import styles from "./Breadcrumbs.module.scss"

export interface Props {
    pages: {
        label: ReactNode
        href?: string
    }[]
    className?: string
}

export default function Breadcrumbs({ pages, className }: Props) {
    // https://www.w3.org/TR/wai-aria-practices/examples/breadcrumb/index.html
    return <nav aria-label="Breadcrumb" className={classNames(styles.breadcrumbs, className)}>
        <ol>
            {pages.map((page, index) => {
                const isLast = index == pages.length - 1

                const a = <a aria-current={isLast ? "page" : undefined}>
                    {page.label}
                </a>

                return <li key={page.href || index}>
                    {page.href ? <Link href={page.href}>{a}</Link> : a}
                </li>
            })}
        </ol>
    </nav>
}
