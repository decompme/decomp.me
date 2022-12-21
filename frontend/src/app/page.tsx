import classNames from "classnames"

import ScratchList, { SingleLineScratchItem } from "@/components/ScratchList"
import YourScratchList from "@/components/YourScratchList"

import styles from "./page.module.scss"
import SetPageTitle from "./SetPageTitle"
import WelcomeInfo from "./WelcomeInfo"

export default function Page() {
    return <main className={styles.container}>
        <SetPageTitle title="" />
        <div className={styles.padl} />
        <div className={styles.padr} />
        <header className={classNames(styles.about, "p-4")}>
            <WelcomeInfo />
        </header>
        <section className={styles.activity}>
            <h2>Recently updated</h2>
            <ScratchList url="/scratch?page_size=30" className={styles.scratchList} />
        </section>
        <section className={styles.projects}>
            <h2>Your scratches</h2>
            <YourScratchList
                className={styles.yourScratchList}
                item={SingleLineScratchItem}
            />
        </section>
    </main>
}
