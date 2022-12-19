"use client" // TEMP

import { useEffect, useReducer } from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { ThreeBarsIcon, XIcon } from "@primer/octicons-react"
import classNames from "classnames"

import Frog from "./frog.svg"
import LoginState from "./LoginState"
import styles from "./Nav.module.scss"
import Search from "./Search"

export interface Props {
    border?: boolean
    children?: React.ReactNode
}

export default function Nav({ border, children }: Props) {
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

    // If the user clicks outside the nav, close it
    useEffect(() => {
        if (isOpen) {
            document.body.addEventListener("click", toggleOpen)
            return () => document.body.removeEventListener("click", toggleOpen)
        }
    }, [isOpen])

    return (
        <nav
            className={classNames({
                [styles.container]: true,
                [styles.border]: border,
            })}
            aria-labelledby="navtoggle"
            data-open={isOpen}
            data-force-toggle={!!children}
            onClick={evt => evt.stopPropagation()} // Don't close the nav if the user clicks inside it
        >
            <ul className={styles.header}>
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
                    <Link href="/" aria-label="decomp.me">

                        <Frog width={24} height={24} />

                    </Link>
                </li>
                <li className={styles.headerItemLoginState}>
                    <LoginState />
                </li>
                {children
                    ? <li className={styles.customchildren}>{children}</li>
                    : <li className={styles.desktopLinks}>
                        <ul>
                            <li>
                                <Search />
                            </li>
                            <li>
                                <Link href="/new">New scratch</Link>
                            </li>
                            <li>
                                <Link href="/projects">Projects</Link>
                            </li>
                            <li>
                                <Link href="/settings/appearance">Settings</Link>
                            </li>
                        </ul>
                    </li>
                }
            </ul>
            <div className={styles.menu}>
                <div className={styles.searchContainer}>
                    <Search className={styles.search} />
                </div>
                <ul className={styles.links}>
                    <li>
                        <Link href="/">Dashboard</Link>
                    </li>
                    <li>
                        <Link href="/new">New scratch</Link>
                    </li>
                    <li>
                        <Link href="/projects">Projects</Link>
                    </li>
                    <li>
                        <Link href="/settings/appearance">Settings</Link>
                    </li>
                </ul>
            </div>
        </nav>
    )
}
