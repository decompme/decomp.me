import { useState } from "react"

import Image from "next/future/image"

import classNames from "classnames"
import { useLayer } from "react-laag"

import * as api from "../../lib/api"
import GitHubLoginButton from "../GitHubLoginButton"
import VerticalMenu from "../VerticalMenu"

import styles from "./LoginState.module.scss"
import UserMenu from "./UserMenuItems"

export default function LoginState({ className }: { className?: string }) {
    const user = api.useThisUser()
    const [isUserMenuOpen, setUserMenuOpen] = useState(false)

    const { renderLayer, triggerProps, layerProps } = useLayer({
        isOpen: isUserMenuOpen,
        onOutsideClick: () => setUserMenuOpen(false),
        overflowContainer: false,
        auto: false,
        placement: "bottom-end",
        triggerOffset: 4,
    })

    if (!user) {
        // Loading...
        return <div />
    }

    if (api.isAnonUser(user)) {
        return <GitHubLoginButton popup label="Sign in" />
    }

    return <button
        className={classNames(styles.user, className)}
        onClick={() => setUserMenuOpen(!isUserMenuOpen)}
        {...triggerProps}
    >
        <Image
            className={styles.avatar}
            src={user.avatar_url}
            alt="Account menu"
            width={24}
            height={24}
            sizes="24px"
            priority
        />
        {renderLayer(<div {...layerProps}>
            {isUserMenuOpen && <VerticalMenu open={isUserMenuOpen} setOpen={setUserMenuOpen}>
                <UserMenu />
            </VerticalMenu>}
        </div>)}
    </button>
}
