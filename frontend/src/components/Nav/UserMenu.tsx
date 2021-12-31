import { useRouter } from "next/router"

import { mutate } from "swr"

import * as api from "../../lib/api"
import VerticalMenu, { ButtonItem, MenuItem } from "../VerticalMenu"

export default function UserMenu({ close }: { close: () => void }) {
    const user = api.useThisUser()
    const router = useRouter()

    const linkTo = (href: string) => () => {
        close()
        router.push(href)
    }

    if (api.isAnonUser(user)) {
        return <VerticalMenu>
            <ButtonItem onClick={linkTo("/login")}>
                Sign in
            </ButtonItem>
        </VerticalMenu>
    }

    const signOut = async () => {
        const user = await api.post("/user", {})
        await mutate("/user", user)
        close()
    }

    return <VerticalMenu>
        <MenuItem>
            <span style={{ opacity: 0.6 }}>
                Signed in as <b style={{ fontWeight: 600 }}>{user.username}</b>
            </span>
        </MenuItem>
        <hr />
        <ButtonItem onClick={linkTo(`/u/${user.username}`)}>
            Your profile
        </ButtonItem>
        <hr />
        <ButtonItem onClick={signOut}>
            Sign out
        </ButtonItem>
    </VerticalMenu>
}
