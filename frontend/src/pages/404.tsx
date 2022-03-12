import useTranslation from "next-translate/useTranslation"

import Footer from "../components/Footer"
import Nav from "../components/Nav"
import Frog from "../components/Nav/frog.svg"

import styles from "./404.module.scss"


export default function Error404Page() {
    const { t } = useTranslation("compilers")

    return <>
        <Nav />
        <main className={styles.container}>
            <Frog />
            <h1>
                <b>404</b>. Page not found.
                {t("gcc2.8.1")}
            </h1>
        </main>
        <Footer />
    </>
}
