import Link from "next/link"

import { PlusIcon } from "@primer/octicons-react"

import styles from "./Nav.module.css"
import LoginState, { Props as LoginStateProps } from "./user/LoginState"

export type Props = {
    onUserChange?: LoginStateProps["onChange"],
}

export default function Nav({ onUserChange }: Props) {
    return <nav className={styles.nav}>
        <span className={styles.logotype}>
            decomp.me
        </span>

        <Link href="/scratch">
            <a className={styles.link}><PlusIcon size={16} /> New scratch</a>
        </Link>

        <div className={styles.grow} />

        <LoginState onChange={onUserChange} />
    </nav>
}
