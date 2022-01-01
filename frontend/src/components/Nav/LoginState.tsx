import { useState } from "react"

import Image from "next/image"

import { TriangleDownIcon } from "@primer/octicons-react"
import { useLayer } from "react-laag"

import * as api from "../../lib/api"

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
    }

    return <div
        className={styles.user}
        onClick={() => setUserMenuOpen(!isUserMenuOpen)}
        {...triggerProps}
    >
        {api.isAnonUser(user)
            ? "Not signed in"
            : <Image
                className={styles.avatar}
                src={user.avatar_url}
                alt="Avatar"
                width={24}
                height={24}
                priority
            />
        }
        <TriangleDownIcon />
        {renderLayer(<div {...layerProps}>
            {isUserMenuOpen && <UserMenu close={() => setUserMenuOpen(false)} />}
        </div>)}
    </div>
}
