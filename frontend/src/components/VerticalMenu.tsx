import { ReactNode } from "react"

import styles from "./VerticalMenu.module.scss"

export default function VerticalMenu({ children }: { children: ReactNode }) {
    return <ul className={styles.menu}>
        {children}
    </ul>
}

export function MenuItem({ children }: { children: ReactNode }) {
    return <li className={styles.item}>
        {children}
    </li>
}

export function ButtonItem({ children, onClick }: { children: ReactNode, onClick: () => void }) {
    return <a
        className={styles.item}
        onClick={evt => {
            evt.stopPropagation() // Prevent reopening menu
            onClick()
        }}
    >
        {children}
    </a>
}
