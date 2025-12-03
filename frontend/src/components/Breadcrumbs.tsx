import type { ReactNode } from "react";

import Link from "next/link";

import clsx from "clsx";

import styles from "./Breadcrumbs.module.scss";

export interface Props {
    pages: {
        label: ReactNode;
        href?: string;
    }[];
    className?: string;
}

export default function Breadcrumbs({ pages, className }: Props) {
    // https://www.w3.org/TR/wai-aria-practices/examples/breadcrumb/index.html
    return (
        <nav
            aria-label="Breadcrumb"
            className={clsx(styles.breadcrumbs, className)}
        >
            <ol>
                {pages.map((page, index) => {
                    const isLast = index === pages.length - 1;
                    return (
                        <li key={page.href || index}>
                            {page.href ? (
                                <Link
                                    href={page.href}
                                    aria-current={isLast ? "page" : undefined}
                                >
                                    {page.label}
                                </Link>
                            ) : (
                                page.label
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
