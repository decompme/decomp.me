"use client"

import Link from "next/link"

import { ArrowRightIcon } from "@primer/octicons-react"
import { usePlausible } from "next-plausible"

import Button from "../components/Button"
import Footer from "../components/Footer"
import GitHubLoginButton from "../components/GitHubLoginButton"
import Nav from "../components/Nav"
import PageTitle from "../components/PageTitle"
import ScratchList, { SingleLineScratchItem } from "../components/ScratchList"
import YourScratchList from "../components/YourScratchList"
import * as api from "../lib/api"

import styles from "./page.module.scss"

const DECOMP_ME_DESCRIPTION = "decomp.me is a collaborative online space where you can contribute to ongoing decompilation projects."

export default function Page() {
    const user = api.useThisUser()
    const stats = api.useStats()
    const plausible = usePlausible()

    return <>
        <PageTitle description={DECOMP_ME_DESCRIPTION} />
        <Nav />
        <main className={styles.container}>
            <div className={styles.padl} />
            <div className={styles.padr} />
            <header className={styles.about}>
                <h1>
                    Welcome to <span className={styles.siteName}>decomp.me</span>
                </h1>
                <div className={styles.aboutColumnsContainer}>
                    <div>
                        <p>
                            {DECOMP_ME_DESCRIPTION}
                        </p>
                        <div className={styles.cta}>
                            {user?.is_anonymous && <GitHubLoginButton popup />}
                            <Link href="/new">

                                <Button primary onClick={() => plausible("indexCtaPress")}>
                            Start decomping
                                    <ArrowRightIcon />
                                </Button>

                            </Link>
                        </div>
                    </div>
                    {stats && <p>
                        {stats.scratch_count.toLocaleString()} scratches created<br />
                        {stats.profile_count.toLocaleString()} unique visitors<br />
                        {stats.github_user_count.toLocaleString()} users signed up<br />
                        {stats.asm_count.toLocaleString()} asm globs submitted
                    </p>}
                </div>
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
        <Footer />
    </>
}
