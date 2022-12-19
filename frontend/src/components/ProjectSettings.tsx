import { useEffect, useState } from "react"

import { useRouter } from "next/navigation"

import * as api from "../lib/api"
import useEntity from "../lib/useEntity"

import AsyncButton from "./AsyncButton"
import FieldSet from "./FieldSet"
import ImageInput from "./ImageInput"
import ProjectMembers from "./ProjectMembers"
import styles from "./ProjectSettings.module.scss"

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

    return (
        <FieldSet
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
    )
}

export default function ProjectSettings({ project }: { project: api.Project }) {
    const router = useRouter()
    const userIsMember = api.useIsUserProjectMember(project)

    if (!userIsMember) {
        return <div className={styles.container}>
            You must be a member of this project to view its settings.
        </div>
    }

    return <div className={styles.container}>
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
}
