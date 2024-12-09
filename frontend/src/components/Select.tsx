import type { ReactNode, ChangeEventHandler } from "react"

import { ChevronDownIcon } from "@primer/octicons-react"

import styles from "./Select.module.scss"

export type Props = {
    className?: string
    onChange: ChangeEventHandler<HTMLSelectElement>
    children: ReactNode
    value?: string
}

export default function Select({ onChange, children, className, value }: Props) {
    return <div className={`${styles.group} ${className}`}>
        <select onChange={onChange} value={value}>
            {children}
        </select>

        <div className={styles.icon}>
            <ChevronDownIcon size={16} />
        </div>
    </div>
}
