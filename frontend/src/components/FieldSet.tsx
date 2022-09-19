import { ReactNode, useId } from "react"

import classNames from "classnames"

import styles from "./FieldSet.module.scss"

export interface Props {
    label: ReactNode
    children: ReactNode
    actions?: ReactNode // Right side of footer
    status?: ReactNode // Left side of footer
    className?: string
}

export default function FieldSet({ label, children, actions, status, className }: Props) {
    const labelId = useId()

    return <div
        role="group"
        aria-labelledby={labelId}
        className={classNames(styles.fieldset, className)}
    >
        <div>
            <h4 id={labelId} className={styles.label}>
                {label}
            </h4>
            {children}
        </div>
        {(status || actions) && <footer role="group" aria-label="Actions">
            <div>
                {status}
            </div>
            <div>
                {actions}
            </div>
        </footer>}
    </div>
}
