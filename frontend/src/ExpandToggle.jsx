import { h, Fragment } from "preact"
import { useState } from "preact/hooks"

import styles from "./ExpandToggle.module.css"

export default function ExpandToggle({ label, children }) {
    const [expanded, setExpanded] = useState(false)

    return <>
        <div className={styles.toggle} onClick={() => setExpanded(!expanded)}>
            {expanded ? "v " : "> " /* TODO */}
            {label}
        </div>
        {expanded && children}
    </>
}
