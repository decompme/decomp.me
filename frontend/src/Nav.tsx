import { Link } from "react-router-dom"
import { PlusIcon } from "@primer/octicons-react"

import LoginState, { Props as LoginStateProps } from "./user/LoginState"

import styles from "./Nav.module.css"

export type Props = {
    onUserChange?: LoginStateProps["onChange"],
}

export default function Nav({ onUserChange }: Props) {
    return <nav className={styles.nav}>
        <span className={styles.logotype}>
            decomp.me
        </span>

        <Link className={styles.link} to="/scratch">
            <PlusIcon size={16} /> New scratch
        </Link>

        <div className={styles.grow} />

        <LoginState onChange={onUserChange} />
    </nav>
}
