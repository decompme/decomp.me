import { GetStaticProps } from "next"

import Image from "next/image"
import Link from "next/link"

import { MarkGithubIcon } from "@primer/octicons-react"
import TimeAgo from "react-timeago"

import Footer from "../components/Footer"
import Loading from "../components/loading.svg"
import Nav from "../components/Nav"
import PageTitle from "../components/PageTitle"
import PlatformIcon from "../components/PlatformSelect/PlatformIcon"
import PlatformName from "../components/PlatformSelect/PlatformName"
import * as api from "../lib/api"

import styles from "./projects.module.scss"

function ProjectList({ initialPage }: { initialPage: api.Page<api.Project> }) {
    const { results, isLoading, hasNext, loadNext } = api.usePaginated<api.Project>("/projects", initialPage)

    return <ul className={styles.projectList} aria-label="Project list">
        {results.map((project, i) => (
            <li key={project.url}>
                <div>
                    <Link href={project.html_url}>
                        <a className={styles.projectLink}>
                            <Image priority={i <= 4} src={project.icon_url} alt="" width={32} height={32} />
                            {project.slug}
                        </a>
                    </Link>
                </div>
                <div className={styles.description}>
                    {project.description}
                </div>
                <div className={styles.metadata}>
                    <div>
                        Updated <TimeAgo date={project.repo.last_pulled} />
                    </div>
                    <div>
                        80% complete
                    </div>
                    {project.most_common_platform && <div className={styles.platform}>
                        <PlatformIcon platform={project.most_common_platform} size={16} />
                        <PlatformName platform={project.most_common_platform} />
                    </div>}
                    <div>
                        <Link href={project.repo.html_url}>
                            <a className={styles.repo}>
                                <MarkGithubIcon size={16} />
                                {project.repo.owner}/{project.repo.repo}
                            </a>
                        </Link>
                    </div>
                </div>
            </li>
        ))}
        {hasNext && <li className={styles.loadMoreLink}>
            <button onClick={loadNext} data-is-loading={isLoading}>
                {isLoading ? <Loading /> : "Show more"}
            </button>
        </li>}
    </ul>
}

export const getStaticProps: GetStaticProps = async _context => {
    const initialPage: api.Page<api.Project> = await api.get("/projects")

    return {
        props: {
            initialPage,
        },
        revalidate: 60,
    }
}

export default function ProjectsPage({ initialPage }: { initialPage: api.Page<api.Project> }) {
    return <>
        <PageTitle title="Projects" />
        <Nav />
        <main>
            <header className={styles.header}>
                <div className={styles.container}>
                    <h1>Projects</h1>
                </div>
            </header>
            <div className={styles.container}>
                <ProjectList initialPage={initialPage} />
            </div>
        </main>
        <Footer />
    </>
}