import { useRouter } from "next/router"

import { mutate } from "swr"

import * as api from "../../lib/api"
import VerticalMenu, { MenuItem, ButtonItem, LinkItem } from "../VerticalMenu"

export default function UserMenu({ close }: { close: () => void }) {
    const user = api.useThisUser()

    if (api.isAnonUser(user)) {
        return <VerticalMenu close={close}>
            <LinkItem href="/login">
                Sign in
            </LinkItem>
        </VerticalMenu>
    }

    return <VerticalMenu close={close}>
        <MenuItem>
            <span style={{ opacity: 0.6 }}>
                Signed in as <b style={{ fontWeight: 600 }}>{user.username}</b>
            </span>
        </MenuItem>
        <hr />
        <LinkItem href={`/u/${user.username}`}>
            Your profile
        </LinkItem>
        <LinkItem href="/settings">
            Settings
        </LinkItem>
        <hr />
        <ButtonItem
            onClick={async () => {
                const user = await api.post("/user", {})
                await mutate("/user", user)
            }}
        >
            Sign out
        </ButtonItem>
    </VerticalMenu>
}
