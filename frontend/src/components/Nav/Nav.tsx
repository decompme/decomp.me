import Link from "next/link"

import Frog from "./frog.svg"
import LoginState, { Props as LoginStateProps } from "./LoginState"
import styles from "./Nav.module.scss"

const onUserChangeNop: LoginStateProps["onChange"] = _user => {}

export type Props = {
    children?: React.ReactNode
    onUserChange?: LoginStateProps["onChange"]
}

export default function Nav({ children, onUserChange }: Props) {
    return <nav className={styles.nav}>
        <Link href="/">
            <a className={styles.logo}>
                <Frog width={32} height={32} />
            </a>
        </Link>

        {children ?? <>
            <Link href="/scratch/new">
                <a className={styles.item}>New scratch</a>
            </Link>
            <Link href="/training">
                <a className={styles.item}>Training</a>
            </Link>
        </>}

        <div className={styles.grow} />

        <LoginState onChange={onUserChange ?? onUserChangeNop} />
    </nav>
}
