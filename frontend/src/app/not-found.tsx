import classNames from "classnames"

import Frog from "../components/Nav/frog.svg"

import styles from "./not-found.module.scss"

export default function NotFound() {
    return <main className={classNames(styles.container, "py-6")}>
        <Frog />
        <h1>
            Page not found.
        </h1>
    </main>
}
