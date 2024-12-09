"use client"

import { type ForwardedRef, forwardRef } from "react"

import Link from "next/link"

import classNames from "classnames"

import styles from "./Button.module.scss"

const Button = forwardRef(function Button({
    children,
    onClick,
    href,
    className,
    disabled,
    primary,
    danger,
    title,
}: Props, ref: ForwardedRef<HTMLButtonElement>) {
    const cn = classNames(className, styles.btn, "px-2.5 py-1.5 rounded text-sm active:translate-y-px", {
        [styles.primary]: primary,
        [styles.danger]: danger,
    })

    if (href) {
        return <Link
            className={cn}
            title={title}
            href={href}
        >
            {children}
        </Link>
    }

    return <button
        ref={ref}
        className={cn}
        onClick={event => {
            if (!disabled && onClick) {
                onClick(event)
            }
        }}
        disabled={disabled}
        title={title}
    >
        {children}
    </button>
})

export type Props = {
    children?: React.ReactNode
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
    href?: string
    className?: string
    disabled?: boolean
    primary?: boolean
    danger?: boolean
    title?: string
}

export default Button
