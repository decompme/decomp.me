import Nav from "../components/Nav"
import Frog from "../components/Nav/frog.svg"

import styles from "./404.module.scss"

export default function Error404Page() {
    return <>
        <Nav />
        <main className={styles.container}>
            <Frog />
            <h1>
                <b>404</b>. Page not found.
            </h1>
        </main>
    </>
}
