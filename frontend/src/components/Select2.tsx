import { ReactNode, ChangeEventHandler } from "react"

import { ChevronDownIcon } from "@primer/octicons-react"

import styles from "./Select.module.css"

export type Props = {
    options: { [key: string]: string },
    value: string,
    className?: string,
    onChange: (value: string) => void,
}

export default function Select({ options, value, onChange, className }: Props) {
    return <div className={`${styles.group} ${className}`}>
        <select
            value={value}
            onChange={event => {
                onChange(event.target.value)
            }}
        >
            {Object.entries(options).map(([key, name]) =>
                <option key={key} value={key}>{name}</option>
            )}
        </select>

        <div className={styles.icon}>
            <ChevronDownIcon size={16} />
        </div>
    </div>
}
