import { ReactNode, ChangeEventHandler } from "react"

import { ChevronDownIcon } from "@primer/octicons-react"

import styles from "./Select.module.scss"

export type Props = {
    className?: string,
    onChange: ChangeEventHandler<HTMLSelectElement>,
    children: ReactNode,
}

export default function Select({ onChange, children, className }: Props) {
    return <div className={`${styles.group} ${className}`}>
        <select onChange={onChange}>
            {children}
        </select>

        <div className={styles.icon}>
            <ChevronDownIcon size={16} />
        </div>
    </div>
}
