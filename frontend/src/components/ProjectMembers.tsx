import { useRouter } from "next/navigation"

import { XIcon } from "@primer/octicons-react"
import useSWR from "swr"

import * as api from "@/lib/api"
import { projectMemberUrl, projectUrl } from "@/lib/api/urls"

import AsyncButton from "./AsyncButton"
import FieldSet from "./FieldSet"
import styles from "./ProjectMembers.module.scss"
import UserLink from "./user/UserLink"

function Member({ member, onRemove }: { member: api.ProjectMember, onRemove?: () => Promise<void> }) {
    const { data, error } = useSWR<api.User>(`/users/${member.username}`, api.get)

    if (error) {
        throw error
    }

    return <li>
        {data && <UserLink user={data} />}
        {onRemove && <AsyncButton
            title="Remove"
            className={styles.removeBtn}
            onClick={onRemove}
        >
            <XIcon />
        </AsyncButton>}
    </li>
}

export default function ProjectMembers({ project }: { project: api.Project }) {
    const user = api.useThisUser()
    const { members, addMember, removeMember } = api.useProjectMembers(project)
    const canAct = api.useIsUserProjectMember(project)
    const router = useRouter()

    return <FieldSet
        label="Members"
        status="Members can modify any project setting as well as delete the project."
        actions={canAct && <AsyncButton
            onClick={async () => {
                const username = prompt("Enter username of new member:")
                if (username && username.length > 0) {
                    await addMember(username)
                }
            }}
        >
            Add member..
        </AsyncButton>}
    >
        <ul className={styles.list}>
            {members.map(member => <Member
                key={projectMemberUrl(project, member)}
                member={member}
                onRemove={canAct ? async () => {
                    if (member.username === user?.username) {
                        if (!confirm("Are you sure you want to remove yourself from this project?")) {
                            return
                        }
                    }

                    await removeMember(member.username)

                    if (member.username === user?.username) {
                        router.push(projectUrl(project))
                    }
                } : undefined}
            />)}
        </ul>
    </FieldSet>
}
