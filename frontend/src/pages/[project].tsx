import { GetStaticPaths, GetStaticProps } from "next"

import Image from "next/image"

import ErrorBoundary from "../components/ErrorBoundary"
import Footer from "../components/Footer"
import Nav from "../components/Nav"
import PageTitle from "../components/PageTitle"
import ProjectFunctionList from "../components/ProjectFunctionList"
import UserAvatarList from "../components/UserAvatarList"
import * as api from "../lib/api"

import styles from "./[project].module.scss"

export const getStaticPaths: GetStaticPaths = async () => {
    const page: api.Page<api.Project> = await api.get("/projects")

    return {
        paths: page.results.map(project => "/" + project.slug),
        fallback: "blocking",
    }
}

export const getStaticProps: GetStaticProps = async context => {
    try {
        const project: api.Scratch = await api.get(`/projects/${context.params.project}`)

        return {
            props: {
                project,
            },
            revalidate: 60, // cache for a minute
        }
    } catch (error) {
        console.log(error)
        return {
            notFound: true,
            revalidate: true,
        }
    }
}

export default function ProjectPage({ project }: { project: api.Project }) {
    return <>
        <PageTitle title={project.slug} />
        <Nav />
        <header className={styles.header}>
            <div className={styles.headerInner}>
                <h1>
                    <Image src={project.icon_url} alt="" width={32} height={32} />
                    {project.slug}
                </h1>
                <div className={styles.maintainers}>
                    <label>Maintainer{project.repo.maintainers.length != 1 && "s"}</label>
                    <UserAvatarList urls={project.repo.maintainers} />
                </div>
            </div>
        </header>
        <main className={styles.container}>
            <ErrorBoundary>
                <h2>Functions</h2>
                <ProjectFunctionList projectUrl={project.url} />
            </ErrorBoundary>
        </main>
        <Footer />
    </>
}
