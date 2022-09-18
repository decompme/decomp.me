import { GetStaticPaths, GetStaticProps } from "next"

import { RepoPullIcon } from "@primer/octicons-react"
import TimeAgo from "react-timeago"
import useSWR from "swr"

import AsyncButton from "../../components/AsyncButton"
import ErrorBoundary from "../../components/ErrorBoundary"
import Footer from "../../components/Footer"
import LoadingSpinner from "../../components/loading.svg"
import Nav from "../../components/Nav"
import PageTitle from "../../components/PageTitle"
import ProjectFunctionList from "../../components/ProjectFunctionList"
import ProjectHeader from "../../components/ProjectHeader"
import PrScratchBasket from "../../components/PrScratchBasket"
import * as api from "../../lib/api"

import styles from "./[project].module.scss"

export const getStaticPaths: GetStaticPaths = async () => {
    const page: api.Page<api.Project> = await api.get("/projects")

    return {
        paths: page.results.map(project => project.html_url),
        fallback: "blocking",
    }
}

export const getStaticProps: GetStaticProps = async context => {
    try {
        const project: api.Project = await api.get(`/projects/${context.params.project}`)

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

    const userIsMember = api.useIsUserProjectMember(project)

    return <>
        <PageTitle title={project.slug} />
        <Nav />
        <ProjectHeader project={project} />
        <PrScratchBasket project={project} />
        {project.repo.is_pulling ? <main className={styles.loadingContainer}>
            <LoadingSpinner width={32} height={32} />
            This project is being updated, please wait
        </main> : <main>
            <ErrorBoundary>
                <div className={styles.container}>
                    <ProjectFunctionList projectUrl={project.url}>
                        <div className={styles.headerActions}>
                            {userIsMember && <AsyncButton
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
                    </ProjectFunctionList>
                </div>
            </ErrorBoundary>
        </main>}
        <Footer />
    </>
}