import { ComponentChildren, h } from "preact"
import { ChevronDownIcon } from "@primer/octicons-react"

import styles from "./Select.module.css"

export type Props = {
    class?: string,
    onChange: h.JSX.GenericEventHandler<HTMLSelectElement>,
    children: ComponentChildren,
}

export default function Select({ onChange, children, class: className }: Props) {
    return <div class={`${styles.group} ${className}`}>
        <select onChange={onChange}>
            {children}
        </select>

        <div class={styles.icon}>
            <ChevronDownIcon size={16} />
        </div>
    </div>
}
