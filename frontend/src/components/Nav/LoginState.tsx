import { useState } from "react";

import Image from "next/image";

import clsx from "clsx";
import { useLayer } from "react-laag";

import * as api from "@/lib/api";
import { userAvatarUrl } from "@/lib/api/urls";

import GitHubLoginButton from "../GitHubLoginButton";
import VerticalMenu from "../VerticalMenu";

import styles from "./LoginState.module.scss";
import UserMenu from "./UserMenuItems";

export default function LoginState({ className }: { className?: string }) {
    const user = api.useThisUser();
    const [isUserMenuOpen, setUserMenuOpen] = useState(false);

    const { renderLayer, triggerProps, layerProps } = useLayer({
        isOpen: isUserMenuOpen,
        onOutsideClick: () => setUserMenuOpen(false),
        overflowContainer: false,
        auto: false,
        placement: "bottom-end",
        triggerOffset: 4,
    });

    if (!user) {
        // Loading...
        return <div />;
    }

    if (api.isAnonUser(user)) {
        return <GitHubLoginButton label="Sign in" />;
    }

    return (
        <button
            className={clsx(styles.user, className)}
            onClick={() => setUserMenuOpen(!isUserMenuOpen)}
            {...triggerProps}
        >
            <Image
                className={styles.avatar}
                src={userAvatarUrl(user)}
                alt="Account menu"
                width={28}
                height={28}
                sizes="28px"
                priority
            />
            {renderLayer(
                <div {...layerProps}>
                    {isUserMenuOpen && (
                        <VerticalMenu
                            open={isUserMenuOpen}
                            setOpen={setUserMenuOpen}
                        >
                            <UserMenu />
                        </VerticalMenu>
                    )}
                </div>,
            )}
        </button>
    );
}
