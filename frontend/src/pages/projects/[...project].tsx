import { GetStaticPaths, GetStaticProps } from "next"

import { useRouter } from "next/router"

import { RepoPullIcon } from "@primer/octicons-react"
import { SWRConfig } from "swr"

import AsyncButton from "../../components/AsyncButton"
import ErrorBoundary from "../../components/ErrorBoundary"
import Footer from "../../components/Footer"
import LoadingSpinner from "../../components/loading.svg"
import Nav from "../../components/Nav"
import PageTitle from "../../components/PageTitle"
import ProjectFunctionList from "../../components/ProjectFunctionList"
import ProjectHeader from "../../components/ProjectHeader"
import ProjectSettings from "../../components/ProjectSettings"
import PrScratchBasket from "../../components/PrScratchBasket"
import * as api from "../../lib/api"
import useEntity from "../../lib/useEntity"
import Error404Page from "../404"

import styles from "./[...project].module.scss"

export enum Tab {
    FUNCTIONS = "functions",
    SETTINGS = "settings",
}

export const DEFAULT_TAB = Tab.FUNCTIONS

export function isValidTab(tab: string): tab is Tab {
    return Object.values(Tab).includes(tab as Tab)
}

export const getStaticPaths: GetStaticPaths = async () => {
    const page: api.Page<api.Project> = await api.get("/projects")

    return {
        paths: page.results.map(project => project.html_url),
        fallback: "blocking",
    }
}

export const getStaticProps: GetStaticProps = async context => {
    const parts = context.params.project
    if (parts.length == 0 || parts.length > 3) {
        return {
            notFound: true,
        }
    }

    try {
        const project: api.Project = await api.get(`/projects/${context.params.project[0]}`)

        return {
            props: {
                project: project,
                fallback: {
                    [api.getURL(project.url)]: project,
                },
            },
            revalidate: 60,
        }
    } catch (error) {
        console.log(error)
        return {
            notFound: true,
            revalidate: true,
        }
    }
}

export function Inner({ url, tab }: { url: string, tab: Tab }) {
    const [project, actions] = useEntity<api.Project>(url)
    const userIsMember = api.useIsUserProjectMember(project)

    return <>
        <PageTitle title={project.slug} description={project.description} />
        <Nav />
        <ProjectHeader project={project} tab={tab} />
        <PrScratchBasket project={project} />
        {project.repo.is_pulling ? <main className={styles.loadingContainer}>
            <LoadingSpinner width={32} height={32} />
            This project is being updated, please wait
        </main> : <main>
            <ErrorBoundary>
                <div className={styles.container}>
                    {tab == Tab.FUNCTIONS && <ProjectFunctionList projectUrl={project.url}>
                        <div className={styles.headerActions}>
                            {userIsMember && <AsyncButton
                                forceLoading={project.repo.is_pulling}
                                onClick={async () => {
                                    actions.swr.mutate(await api.post(project.url + "/pull", {}))
                                }}
                            >
                                <RepoPullIcon /> Pull
                            </AsyncButton>}
                        </div>
                    </ProjectFunctionList>}
                    {tab == Tab.SETTINGS && <ProjectSettings project={project} />}
                </div>
            </ErrorBoundary>
        </main>}
        <Footer />
    </>
}

export default function ProjectPage(props: { project: api.Project, fallback: any }) {
    const router = useRouter()
    const [project, maybeTab, ...rest] = router.query.project as string[]
    const tab = maybeTab ?? DEFAULT_TAB

    if (rest.length || !isValidTab(tab)) {
        return <Error404Page />
    }

    return <SWRConfig value={{ fallback: props.fallback }}>
        <Inner url={`/projects/${project}`} tab={tab} />
    </SWRConfig>
}
