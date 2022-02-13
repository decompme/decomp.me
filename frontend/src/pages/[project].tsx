import { GetStaticPaths, GetStaticProps } from "next"

import Image from "next/image"

import { RepoPullIcon } from "@primer/octicons-react"
import TimeAgo from "react-timeago"
import useSWR from "swr"

import AsyncButton from "../components/AsyncButton"
import ErrorBoundary from "../components/ErrorBoundary"
import Footer from "../components/Footer"
import LoadingSpinner from "../components/loading.svg"
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

export default function ProjectPage(props: { project: api.Project }) {
    const { data: project, mutate } = useSWR<api.Project>(props.project.url, api.get, {
        fallbackData: props.project,

        // Refresh every 2s if the repo is busy being pulled
        refreshInterval: p => (p.repo.is_pulling ? 2000 : 0),
    })
    const user = api.useThisUser()
    const userIsMaintainer = user && project.repo.maintainers.includes(user.url)

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
                <div className={styles.headerActions}>
                    {userIsMaintainer && <AsyncButton
                        forceLoading={project.repo.is_pulling}
                        onClick={async () => {
                            mutate(await api.post(project.url + "/pull", {}))
                        }}
                    >
                        <RepoPullIcon /> Pull
                    </AsyncButton>}

                    <small>
                        Last pulled <TimeAgo date={project.repo.last_pulled} />
                    </small>
                </div>
            </div>
        </header>
        {project.repo.is_pulling ? <main className={styles.loadingContainer}>
            <LoadingSpinner width={32} height={32} />
            This project is being synced, please wait
        </main> : <main className={styles.container}>
            <ErrorBoundary>
                <h2>Functions</h2>
                <ProjectFunctionList projectUrl={project.url} />
            </ErrorBoundary>
        </main>}
        <Footer />
    </>
}
