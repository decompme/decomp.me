import router from "next/router"

import { XIcon } from "@primer/octicons-react"
import useSWR from "swr"

import * as api from "../lib/api"

import AsyncButton from "./AsyncButton"
import styles from "./ProjectMembers.module.scss"
import UserLink from "./user/UserLink"

export default function ProjectMembers(props: { project: api.Project }) {
    const user = api.useThisUser()
    const userIsYou = api.useUserIsYou()
    const { data: project, mutate } = useSWR<api.Project>(props.project.url, api.get, { fallbackData: props.project })
    const canAct = api.useIsUserProjectMember(project)

    const putMembers = async (members: (api.User | api.AnonymousUser)[]) => {
        await api.put(project.url + "/members", {
            members: members.map(member => ({ user_id: member.id })),
        })
        mutate()
    }

    return <div className={styles.container}>
        <h2>
            Project admins

            {canAct && <AsyncButton
                primary
                onClick={async () => {
                    await putMembers([
                        ...project.members,
                        user,
                    ])
                }}
            >
                Invite..
            </AsyncButton>}
        </h2>

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

                        await putMembers(project.members.filter(u => u.url !== user.url))

                        if (userIsYou(user)) {
                            router.push(project.html_url)
                        }
                    }}
                >
                    <XIcon />
                </AsyncButton>}
            </li>)}
        </ul>
    </div>
}
