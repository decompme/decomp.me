import Link from "next/link"

import ErrorBoundary from "../ErrorBoundary"

import Frog from "./frog.svg"
import LoginState from "./LoginState"
import styles from "./Nav.module.scss"

export type Props = {
    children?: React.ReactNode
}

export default function Nav({ children }: Props) {
    return <ErrorBoundary className={styles.nav}>
        <nav className={styles.nav}>
            <Link href="/">
                <a className={styles.logo}>
                    <Frog width={32} height={32} />
                </a>
            </Link>

            {children ?? <>
                <Link href="/scratch/new">
                    <a className={styles.item}>New scratch</a>
                </Link>
                {/* Add back when training is done: (<Link href="/training">
                    <a className={styles.item}>Training</a>
                </Link>) */}
            </>}

            <div className={styles.grow} />

            <ErrorBoundary>
                <LoginState />
            </ErrorBoundary>
        </nav>
    </ErrorBoundary>
}
