import { mutate } from "swr"

import * as api from "../../lib/api"
import GitHubLoginButton from "../GitHubLoginButton"
import { MenuItem, ButtonItem, LinkItem } from "../VerticalMenu"

import styles from "./UserMenuItems.module.scss"

export default function UserMenuItems() {
    const user = api.useThisUser()

    if (api.isAnonUser(user)) {
        return <>
            <MenuItem>
                <div className={styles.status}>
                    Sign in now to keep track of your scratches.
                </div>
            </MenuItem>
            <MenuItem>
                <GitHubLoginButton popup />
            </MenuItem>
            {/*<hr />
            <LinkItem href="/settings">
                Settings
            </LinkItem>*/}
        </>
    }

    return <>
        <MenuItem>
            <div className={styles.status}>
                Signed in as <b>{user.username}</b>
            </div>
        </MenuItem>
        <hr />
        <LinkItem href={`/u/${user.username}`}>
            Your profile
        </LinkItem>
        {/*<LinkItem href="/settings">
            Settings
        /LinkItem>*/}
        <hr />
        <ButtonItem
            onTrigger={async () => {
                const user = await api.post("/user", {})
                await mutate("/user", user)
            }}
        >
            Sign out
        </ButtonItem>
    </>
}
