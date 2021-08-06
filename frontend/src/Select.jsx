import { h } from "preact"
import { ChevronDownIcon } from "@primer/octicons-react"

import styles from "./Select.module.css"

export default function Select({ onChange, children }) {
    return <div class={styles.group}>
        <select onChange={onChange}>
            {children}
        </select>

        <div class={styles.icon}>
            <ChevronDownIcon size={16} />
        </div>
    </div>
}
