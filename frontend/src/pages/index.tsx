import Image from "next/image"
import Link from "next/link"

import { ArrowRightIcon } from "@primer/octicons-react"

import Button from "../components/Button"
import ErrorBoundary from "../components/ErrorBoundary"
import Footer from "../components/Footer"
import GitHubLoginButton from "../components/GitHubLoginButton"
import Nav from "../components/Nav"
import PageTitle from "../components/PageTitle"
import ScratchList from "../components/ScratchList"
import * as api from "../lib/api"

import styles from "./index.module.scss"

const DECOMP_ME_DESCRIPTION = "decomp.me is a collaborative online space where you can contribute to ongoing decompilation projects."

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

    return <>
        <PageTitle description={DECOMP_ME_DESCRIPTION} />
        <Nav />
        <main className={styles.container}>
            <header className={styles.about}>
                <ErrorBoundary>
                    <h1>
                        Welcome to <span className={styles.siteName}>decomp.me</span>
                    </h1>
                    <p>
                        {DECOMP_ME_DESCRIPTION}
                    </p>
                    <div className={styles.cta}>
                        {user?.is_anonymous && <GitHubLoginButton popup />}
                        <Link href="/scratch/new">
                            <a>
                                <Button primary onClick={() => {}}>
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
                    <h2>Projects</h2>
                    <ProjectList />
                </ErrorBoundary>
            </section>
        </main>
        <Footer />
    </>
}
