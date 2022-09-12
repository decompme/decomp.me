import Image from "next/image"
import Link from "next/link"

import { ArrowRightIcon } from "@primer/octicons-react"
import { usePlausible } from "next-plausible"

import Button from "../components/Button"
import ErrorBoundary from "../components/ErrorBoundary"
import Footer from "../components/Footer"
import GitHubLoginButton from "../components/GitHubLoginButton"
import Nav from "../components/Nav"
import PageTitle from "../components/PageTitle"
import ScratchList, { SingleLineScratchItem } from "../components/ScratchList"
import * as api from "../lib/api"

import styles from "./index.module.scss"

const DECOMP_ME_DESCRIPTION = "decomp.me is a collaborative online space where you can contribute to ongoing decompilation projects."
const SHOW_PROJECT_LIST = false

function ProjectList() {
    const { results, isLoading, hasNext, loadNext } = api.usePaginated<api.Project>("/projects")

    return <ul className={styles.projectList}>
        {results.map(project => (
            <li key={project.url}>
                <Link href={project.html_url}>
                    <a className={styles.projectLink}>
                        <Image src={project.icon_url} alt="" width={16} height={16} />
                        {project.slug}
                    </a>
                </Link>
            </li>
        ))}
        {hasNext && <li className={styles.loadMoreLink}>
            <a onClick={loadNext}>
                {isLoading ? "Loading..." : "Show more"}
            </a>
        </li>}
    </ul>
}

export default function IndexPage() {
    const user = api.useThisUser()
    const stats = api.useStats()
    const plausible = usePlausible()

    const yourScratchesUrl = (!user || api.isAnonUser(user))
        ? "/user/scratches?page_size=16" // Using this url all the time results in stale data if you log out
        : `/users/${user.username}/scratches?page_size=16`

    return <>
        <PageTitle description={DECOMP_ME_DESCRIPTION} />
        <Nav />
        <main className={styles.container}>
            <div className={styles.padl} />
            <div className={styles.padr} />
            <header className={styles.about}>
                <ErrorBoundary>
                    <h1>
                        Welcome to <span className={styles.siteName}>decomp.me</span>
                    </h1>
                    <p>
                        {DECOMP_ME_DESCRIPTION}
                    </p>
                    {stats && <p>
                        {stats.scratch_count.toLocaleString()} scratches created<br />
                        {stats.profile_count.toLocaleString()} unique visitors<br />
                        {stats.github_user_count.toLocaleString()} users signed up<br />
                        {stats.asm_count.toLocaleString()} asm globs submitted
                    </p>}
                    <div className={styles.cta}>
                        {user?.is_anonymous && <GitHubLoginButton popup />}
                        <Link href="/new">
                            <a>
                                <Button primary onClick={() => plausible("indexCtaPress")}>
                                    Start decomping
                                    <ArrowRightIcon />
                                </Button>
                            </a>
                        </Link>
                    </div>
                </ErrorBoundary>
            </header>
            <section className={styles.activity}>
                <ErrorBoundary>
                    <h2>Recently updated</h2>
                    <ScratchList url="/scratch?page_size=30" className={styles.scratchList} />
                </ErrorBoundary>
            </section>
            <section className={styles.projects}>
                <ErrorBoundary>
                    {SHOW_PROJECT_LIST && <>
                        <h2>Projects</h2>
                        <ProjectList />
                        <br/>
                    </>}

                    <h2>Your scratches</h2>
                    <ScratchList
                        url={yourScratchesUrl}
                        className={styles.yourScratchList}
                        item={SingleLineScratchItem}
                        emptyButtonLabel="Create your first scratch"
                    />
                </ErrorBoundary>
            </section>
        </main>
        <Footer />
    </>
}
