import router from "next/router"

import { XIcon } from "@primer/octicons-react"
import useSWR from "swr"

import * as api from "../lib/api"

import AsyncButton from "./AsyncButton"
import FieldSet from "./FieldSet"
import styles from "./ProjectMembers.module.scss"
import UserLink from "./user/UserLink"

interface Member {
    username: string
}

export default function ProjectMembers(props: { project: api.Project }) {
    const userIsYou = api.useUserIsYou()
    const { data: project, mutate } = useSWR<api.Project>(props.project.url, api.get, { fallbackData: props.project })
    const canAct = api.useIsUserProjectMember(project)

    const putMembers = async (members: Member[]) => {
        await api.put(project.url + "/members", {
            members: members.map(member => ({ username: member.username })),
        })
        mutate()
    }

    return <FieldSet
        label="Members"
        status="Members can modify any project setting as well as delete the project."
        actions={canAct && <AsyncButton
            onClick={async () => {
                const username = prompt("Enter username of new member:")
                if (username && username.length > 0) {
                    await putMembers([
                        ...project.members,
                        { username },
                    ])
                }
            }}
        >
            Add member..
        </AsyncButton>}
    >
        <ul className={styles.list}>
            {project.members.map(user => <li key={user.url}>
                <UserLink user={user} />
                {canAct && <AsyncButton
                    title="Remove"
                    className={styles.removeBtn}
                    onClick={async () => {
                        if (userIsYou(user)) {
                            if (!confirm(`Are you sure you want to remove yourself from ${project.slug}?`)) {
                                return
                            }
                        }

                        await putMembers(project.members.filter(u => u.username !== user.username))

                        if (userIsYou(user)) {
                            router.push(project.html_url)
                        }
                    }}
                >
                    <XIcon />
                </AsyncButton>}
            </li>)}
        </ul>
    </FieldSet>
}
