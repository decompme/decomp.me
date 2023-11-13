import * as api from "@/lib/api"
import { userUrl } from "@/lib/api/urls"

import UserLink from "./user/UserLink"
import styles from "./UserAvatarList.module.scss"

export default function UserAvatarList({ users }: { users: api.User[] }) {
    return <ul className={styles.list}>
        {users.map(user => <UserLink key={userUrl(user)} user={user} showUsername={false} />)}
    </ul>
}
