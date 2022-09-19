import { useEffect, useState } from "react"

import { GetStaticPaths, GetStaticProps } from "next"

import AsyncButton from "../../../components/AsyncButton"
import Footer from "../../../components/Footer"
import ImageInput from "../../../components/ImageInput"
import Nav from "../../../components/Nav"
import PageTitle from "../../../components/PageTitle"
import ProjectHeader from "../../../components/ProjectHeader"
import ProjectMembers from "../../../components/ProjectMembers"
import * as api from "../../../lib/api"
import { useWarnBeforeUnload } from "../../../lib/hooks"

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

function ProjectDescriptionForm({ project }: { project: api.Project }) {
    const [description, setDescription] = useState(project.description)
    const isSaved = description === project.description

    useWarnBeforeUnload(!isSaved)

    return <section className={styles.fieldset}>
        <div>
            <h2>Description</h2>
            <textarea
                className={styles.descriptionTextarea}
                value={description}
                onChange={evt => setDescription(evt.currentTarget.value)}
                maxLength={1000}
                rows={(description.match(/\n/g)?.length ?? 0) + 1}
            />
        </div>
        <footer>
            <AsyncButton
                primary
                disabled={isSaved}
                onClick={() => api.patch(project.url, { description })}
            >
                Save
            </AsyncButton>
        </footer>
    </section>
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
                <section className={styles.fieldset}>
                    <ProjectMembers project={project} />
                </section>
                <section className={styles.fieldset}>
                    <div>
                        <h2>Icon</h2>
                        <ProjectIconForm project={project} />
                    </div>
                </section>
                <ProjectDescriptionForm project={project} />
                <section className={styles.fieldset} style={{ borderColor: "var(--danger)" }}>
                    <div>
                        <h2>Delete Project</h2>
                        <p>
                            The project will be permanently deleted. This action is irreversible and can not be undone.
                            Scratches associated with this project will not be deleted.
                        </p>
                    </div>
                    <footer>
                        <AsyncButton danger onClick={async () => {
                            if (prompt(`Are you sure you want to PERMANENTLY delete ${project.slug}?\nType '${project.slug}' to continue.`) == project.slug) {
                                await api.delete_(project.url, {})
                                window.location.href = "/"
                            }
                        }}>
                            Delete
                        </AsyncButton>
                    </footer>
                </section>
            </div>
        </main>
        <Footer />
    </>
}
