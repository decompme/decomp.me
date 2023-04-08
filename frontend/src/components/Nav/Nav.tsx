"use client"

import { useEffect, useReducer, ReactNode } from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { ThreeBarsIcon, XIcon } from "@primer/octicons-react"
import classNames from "classnames"

import GhostButton from "../GhostButton"
import Logotype from "../Logotype"

import LoginState from "./LoginState"
import styles from "./Nav.module.scss"
import Search from "./Search"

export interface Props {
    children?: ReactNode
}

export default function Nav({ children }: Props) {
    const [isOpen, toggleOpen] = useReducer(isOpen => !isOpen, false)
    const toggleLabel = `${isOpen ? "Close" : "Open"} Global Navigation Menu`
    const router = useRouter()

    useEffect(() => {
        if (isOpen) {
            const onkeydown = evt => {
                if (evt.key === "Escape") {
                    toggleOpen()
                    document.getElementById("navtoggle").focus()
                    evt.preventDefault()
                }
            }

            document.body.addEventListener("keydown", onkeydown)
            return () => {
                document.body.removeEventListener("keydown", onkeydown)
            }
        }
    }, [isOpen, router])

    return (
        <nav
            className={classNames({
                [styles.container]: true,
            })}
            aria-labelledby="navtoggle"
            data-open={isOpen}
            data-force-toggle={!!children}
            onClick={evt => evt.stopPropagation()} // Don't close the nav if the user clicks inside it
        >
            <ul className={classNames(styles.header, "px-2 md:px-8 lg:px-16")}>
                <li className={styles.headerItemMenuToggle}>
                    <button
                        id="navtoggle"
                        onClick={toggleOpen}
                        onAuxClick={() => window.open("/", "_blank")}
                        aria-label={toggleLabel}
                        aria-expanded={isOpen}
                    >
                        {isOpen ? <XIcon size={24} /> : <ThreeBarsIcon size={18} />}
                    </button>
                </li>
                <li className={styles.headerItemSiteLogo}>
                    <Link href="/" className="transition-colors hover:text-gray-12 active:translate-y-px">
                        <Logotype />
                    </Link>
                </li>
                <li className={styles.headerItemLoginState}>
                    <LoginState />
                </li>
                {children
                    ? <li className={styles.customchildren}>{children}</li>
                    : <li className={styles.desktopLinks}>
                        <ul className="flex w-full gap-2 text-sm">
                            <li className="ml-4">
                                <Search />
                            </li>
                            <div className="grow" />
                            <li>
                                <GhostButton href="/new">New scratch</GhostButton>
                            </li>
                            <div className="h-4 w-px bg-gray-6" />
                            <li>
                                <GhostButton href="/settings">Settings</GhostButton>
                            </li>
                        </ul>
                    </li>
                }
            </ul>
            <div className={classNames(styles.menu, "bg-gray-1")}>
                <div className={styles.searchContainer}>
                    <Search className={styles.search} />
                </div>
                <ul className={styles.links}>
                    <li className="flex items-center justify-center">
                        <Link href="/">
                            <Logotype />
                        </Link>
                    </li>
                    <li>
                        <Link href="/">Dashboard</Link>
                    </li>
                    <li>
                        <Link href="/new">New scratch</Link>
                    </li>
                    <li>
                        <Link href="/settings">Settings</Link>
                    </li>
                </ul>
            </div>
        </nav>
    )
}
