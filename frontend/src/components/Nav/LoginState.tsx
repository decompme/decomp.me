import { useState } from "react"

import Image from "next/image"

import { TriangleDownIcon } from "@primer/octicons-react"
import classNames from "classnames"
import { useLayer } from "react-laag"

import * as api from "../../lib/api"
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

    return <div
        className={classNames(styles.user, className)}
        onClick={() => setUserMenuOpen(!isUserMenuOpen)}
        {...triggerProps}
    >
        {api.isAnonUser(user)
            ? "Not signed in"
            : (user.avatar_url && <Image
                className={styles.avatar}
                src={user.avatar_url}
                alt="Avatar"
                width={24}
                height={24}
                priority
            />)
        }
        <TriangleDownIcon />
        {renderLayer(<div {...layerProps}>
            {isUserMenuOpen && <VerticalMenu open={isUserMenuOpen} setOpen={setUserMenuOpen}>
                <UserMenu />
            </VerticalMenu>}
        </div>)}
    </div>
}
