import { useState } from "react"

import Image from "next/image"

import { useLayer } from "react-laag"

import * as api from "../../lib/api"
import GitHubLoginButton from "../GitHubLoginButton"

import styles from "./LoginState.module.scss"
import UserMenu from "./UserMenu"

export default function LoginState() {
    const user = api.useThisUser()
    const [isUserMenuOpen, setUserMenuOpen] = useState(false)

    const { renderLayer, triggerProps, layerProps } = useLayer({
        isOpen: isUserMenuOpen,
        onOutsideClick: () => setUserMenuOpen(false),
        overflowContainer: false,
        auto: false,
        placement: "bottom-end",
        triggerOffset: 2,
    })

    if (!user) {
        // Loading...
        return <div />
    } else if (user && !api.isAnonUser(user) && user.username) {
        return <div
            title={`@${user.username}`}
            className={styles.user}
            onClick={() => setUserMenuOpen(true)}
            {...triggerProps}
        >
            {user.avatar_url && <Image
                className={styles.avatar}
                src={user.avatar_url}
                alt={user.username}
                width={24}
                height={24}
                priority
            />}
            {renderLayer(<div {...layerProps}>
                {isUserMenuOpen && <UserMenu close={() => setUserMenuOpen(false)} />}
            </div>)}
        </div>
    } else {
        return <div>
            <GitHubLoginButton label="Sign in" />
        </div>
    }
}
