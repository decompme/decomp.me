import { ForwardedRef, forwardRef } from "react"

import classNames from "classnames"

import styles from "./Button.module.scss"

const Button = forwardRef(function Button({
    children,
    onClick,
    className,
    disabled,
    primary,
    danger,
    title,
}: Props, ref: ForwardedRef<HTMLButtonElement>) {
    return <button
        ref={ref}
        className={classNames(className, styles.btn, "px-2.5 py-1.5 rounded text-sm active:translate-y-px", {
            [styles.primary]: primary,
            [styles.danger]: danger,
        })}
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
    className?: string
    disabled?: boolean
    primary?: boolean
    danger?: boolean
    title?: string
}

export default Button
