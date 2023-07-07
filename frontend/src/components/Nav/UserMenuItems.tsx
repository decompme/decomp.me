import { mutate } from "swr"

import * as api from "@/lib/api"

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
                <GitHubLoginButton />
            </MenuItem>
        </>
    }

    return <>
        <MenuItem>
            <div className={styles.status}>
                Signed in as <b>{user.username}</b>
            </div>
        </MenuItem>
        <LinkItem href={`/u/${user.username}`}>
            Your profile
        </LinkItem>
        <hr />
        {user.is_admin && <LinkItem href={"/admin"}>Admin</LinkItem>}
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
