import * as api from "../lib/api"

import UserLink from "./user/UserLink"
import styles from "./UserAvatarList.module.scss"

export default function UserAvatarList({ users }: { users: api.User[] }) {
    return <ul className={styles.list}>
        {users.map(user => <UserLink key={user.url} user={user} showUsername={false} />)}
    </ul>
}
