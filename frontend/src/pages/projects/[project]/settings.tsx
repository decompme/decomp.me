import { useEffect, useState } from "react"

import { GetStaticPaths, GetStaticProps } from "next"

import { useRouter } from "next/router"

import { SWRConfig } from "swr"

import AsyncButton from "../../../components/AsyncButton"
import FieldSet from "../../../components/FieldSet"
import Footer from "../../../components/Footer"
import ImageInput from "../../../components/ImageInput"
import Nav from "../../../components/Nav"
import PageTitle from "../../../components/PageTitle"
import ProjectHeader from "../../../components/ProjectHeader"
import ProjectMembers from "../../../components/ProjectMembers"
import * as api from "../../../lib/api"
import useEntity from "../../../lib/useEntity"

import styles from "./settings.module.scss"

function ProjectIconForm({ project }: { project: api.Project }) {
    const [file, setFile] = useState<File>()

    useEffect(() => {
        if (file) {
            const data = new FormData()
            data.append("icon", file)

            api.patch(project.url, data).catch(console.error)
        }
    }, [file, project.url])

    return <ImageInput
        file={file}
        onChange={setFile}
        fallbackUrl={project.icon}
        className={styles.icon}
    />
}

function ProjectDescriptionForm({ url }: { url: string }) {
    const [project, actions] = useEntity<api.Project>(url)

    return <FieldSet
        label="Description"
        actions={<AsyncButton
            primary
            disabled={actions.isSaved}
            onClick={actions.save}
        >
            Save
        </AsyncButton>}
    >
        <textarea
            className={styles.descriptionTextarea}
            value={project.description}
            onChange={evt => actions.assign({ description: evt.currentTarget.value })}
            maxLength={1000}
            rows={(project.description.match(/\n/g)?.length ?? 0) + 1}
        />
    </FieldSet>
}

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

export default function ProjectSettingsPage({ project, fallback }) {
    const router = useRouter()

    return <SWRConfig value={{ fallback }}>
        <PageTitle title={project.slug} />
        <Nav />
        <ProjectHeader project={project} />
        <main>
            <div className={styles.container}>
                <ProjectMembers project={project} />
                <FieldSet label="Icon">
                    <ProjectIconForm project={project} />
                </FieldSet>
                <ProjectDescriptionForm url={project.url} />
                <FieldSet
                    label="Delete Project"
                    className={styles.borderDanger}
                    actions={<AsyncButton
                        danger
                        onClick={async () => {
                            const msg = [
                                `Are you sure you want to permanently delete ${project.slug}?`,
                                `Type '${project.slug}' to continue.`,
                            ].join("\n")
                            if (prompt(msg) == project.slug) {
                                await api.delete_(project.url, {})
                                router.push("/projects")
                            }
                        }}
                    >
                        Delete
                    </AsyncButton>}
                >
                    <p>
                        The project will be permanently deleted. This action is irreversible and can not be undone.
                        Scratches associated with this project will not be deleted.
                    </p>
                </FieldSet>
            </div>
        </main>
        <Footer />
    </SWRConfig>
}
