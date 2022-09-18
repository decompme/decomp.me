import { GetStaticPaths, GetStaticProps } from "next"

import { TrashIcon } from "@primer/octicons-react"

import AsyncButton from "../../../components/AsyncButton"
import Footer from "../../../components/Footer"
import Nav from "../../../components/Nav"
import PageTitle from "../../../components/PageTitle"
import ProjectHeader from "../../../components/ProjectHeader"
import ProjectMembers from "../../../components/ProjectMembers"
import * as api from "../../../lib/api"

import styles from "./settings.module.scss"

export const getStaticPaths: GetStaticPaths = async () => {
    const page: api.Page<api.Project> = await api.get("/projects")

    return {
        paths: page.results.map(project => project.html_url + "/settings"),
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

export default function ProjectSettingsPage({ project }: { project: api.Project }) {
    return <>
        <PageTitle title={project.slug} />
        <Nav />
        <ProjectHeader project={project} />
        <main>
            <div className={styles.container}>
                <ProjectMembers project={project} />
                <section aria-label="Danger zone" className={styles.dangerZone}>
                    <h2>Delete project</h2>
                    <AsyncButton danger onClick={async () => {
                        if (prompt(`Are you sure you want to PERMANENTLY delete ${project.slug}?\nType '${project.slug}' to continue.`) == project.slug) {
                            await api.delete_(project.url, {})
                            window.location.href = "/"
                        }
                    }}>
                        <TrashIcon /> Delete {project.slug} forever
                    </AsyncButton>
                </section>
            </div>
        </main>
        <Footer />
    </>
}
