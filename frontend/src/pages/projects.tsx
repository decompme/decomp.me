import { GetStaticProps } from "next"

import Link from "next/link"

import { MarkGithubIcon } from "@primer/octicons-react"
import TimeAgo from "react-timeago"

import Footer from "../components/Footer"
import Loading from "../components/loading.svg"
import Nav from "../components/Nav"
import PageTitle from "../components/PageTitle"
import PlatformIcon from "../components/PlatformSelect/PlatformIcon"
import PlatformName from "../components/PlatformSelect/PlatformName"
import ProjectIcon from "../components/ProjectIcon"
import * as api from "../lib/api"

import styles from "./projects.module.scss"

function ProjectList({ initialPage }: { initialPage: api.Page<api.Project> }) {
    const { results, isLoading, hasNext, loadNext } = api.usePaginated<api.Project>("/projects", initialPage)

    return (
        <ul className={styles.projectList} aria-label="Project list">
            {results.map(project => (
                <li key={project.url}>
                    <div>
                        <Link href={project.html_url} className={styles.projectLink}>

                            <ProjectIcon project={project} size={48} />
                            {project.slug}

                        </Link>
                    </div>
                    {project.description && <div className={styles.description}>
                        {project.description}
                    </div>}
                    <div className={styles.metadata}>
                        <div>
                            Updated <TimeAgo date={project.repo.last_pulled} />
                        </div>
                        <div>
                            {project.unmatched_function_count} functions
                        </div>
                        {project.platform && <div className={styles.platform}>
                            <PlatformIcon platform={project.platform} size={16} />
                            <PlatformName platform={project.platform} />
                        </div>}
                        <div>
                            <Link href={project.repo.html_url} className={styles.repo}>

                                <MarkGithubIcon size={16} />
                                {project.repo.owner}/{project.repo.repo}

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
    )
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
