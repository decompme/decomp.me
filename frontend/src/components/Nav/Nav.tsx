import Link from "next/link"

import ErrorBoundary from "../ErrorBoundary"

import Frog from "./frog.svg"
import LoginState, { Props as LoginStateProps } from "./LoginState"
import styles from "./Nav.module.scss"

const onUserChangeNop: LoginStateProps["onChange"] = _user => {}

export type Props = {
    children?: React.ReactNode
    onUserChange?: LoginStateProps["onChange"]
}

export default function Nav({ children, onUserChange }: Props) {
    return <ErrorBoundary className={styles.nav}>
        <nav className={styles.nav}>
            <Link href="/">
                <a className={styles.logo}>
                    <Frog width={32} height={32} />
                </a>
            </Link>

            {children ?? <Link href="/scratch/new">
                <a className={styles.item}>New scratch</a>
            </Link>}

            <div className={styles.grow} />

            <ErrorBoundary>
                <LoginState onChange={onUserChange ?? onUserChangeNop} />
            </ErrorBoundary>
        </nav>
    </ErrorBoundary>
}
