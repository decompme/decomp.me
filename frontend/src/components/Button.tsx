import { ForwardedRef, forwardRef } from "react"

import classNames from "classnames"

import styles from "./Button.module.scss"

const Button = forwardRef(function Button({
    children,
    onClick,
    className,
    disabled,
    primary,
}: Props, ref: ForwardedRef<HTMLButtonElement>) {
    return <button
        ref={ref}
        className={classNames(className, styles.btn, {
            [styles.primary]: primary,
        })}
        onClick={event => {
            if (!disabled && onClick) {
                onClick(event)
            }
        }}
        disabled={disabled}
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
}

export default Button
