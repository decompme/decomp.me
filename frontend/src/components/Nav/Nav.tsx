import Link from "next/link"

import Frog from "./frog.svg"
import LoginState, { Props as LoginStateProps } from "./LoginState"
import styles from "./Nav.module.scss"

const onUserChangeNop = (_user: any) => {}

export type Props = {
    onUserChange?: LoginStateProps["onChange"],
}

export default function Nav({ onUserChange }: Props) {
    return <nav className={styles.nav}>
        <Link href="/">
            <a className={styles.logo}>
                <Frog width={32} height={32} />
            </a>
        </Link>

        <Link href="/scratch">
            <a className={styles.item}>New scratch</a>
        </Link>

        <div className={styles.grow} />

        <LoginState onChange={onUserChange ?? onUserChangeNop} />
    </nav>
}
