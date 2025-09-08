import type { ReactNode } from "react";

import Link from "next/link";

import clsx from "clsx";

export type Props = {
    href?: string;
    onClick?: () => void;
    children: ReactNode;
    className?: string;
};

export default function GhostButton({
    children,
    href,
    onClick,
    className,
}: Props) {
    const isClickable = !!(href || onClick);
    const cn = clsx(
        className,
        "flex items-center gap-2 rounded bg-transparent px-2 py-1 text-sm whitespace-nowrap",
        {
            "transition-colors hover:bg-gray-3 cursor-pointer active:translate-y-px hover:text-gray-12":
                isClickable,
        },
    );

    if (href) {
        return (
            <Link href={href} prefetch={false} className={cn} onClick={onClick}>
                {children}
            </Link>
        );
    }

    if (onClick) {
        return (
            <button className={cn} onClick={onClick}>
                {children}
            </button>
        );
    }

    return <div className={cn}>{children}</div>;
}
