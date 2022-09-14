import { useEffect, useReducer } from "react"

import Link from "next/link"
import { useRouter } from "next/router"

import { ThreeBarsIcon, XIcon } from "@primer/octicons-react"

import Frog from "./frog.svg"
import LoginState from "./LoginState"
import styles from "./Nav.module.scss"
import Search from "./Search"

export interface Props {
    children?: React.ReactNode
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

            const onroutechange = () => {
                toggleOpen()
            }

            document.body.addEventListener("keydown", onkeydown)
            router.events.on("routeChangeComplete", onroutechange)
            return () => {
                document.body.removeEventListener("keydown", onkeydown)
                router.events.off("routeChangeComplete", onroutechange)
            }
        }
    }, [isOpen, router])

    return <nav className={styles.container} aria-labelledby="navtoggle" data-open={isOpen} data-force-toggle={!!children}>
        <ul className={styles.header}>
            <li className={styles.headerItemMenuToggle}>
                <button id="navtoggle" onClick={toggleOpen} aria-label={toggleLabel} aria-expanded={isOpen}>
                    {isOpen ? <XIcon size={24} /> : <ThreeBarsIcon size={18} />}
                </button>
            </li>
            <li className={styles.headerItemSiteLogo}>
                <Link href="/">
                    <a aria-label="decomp.me">
                        <Frog width={24} height={24} />
                    </a>
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
                    <Link href="/settings/appearance">Settings</Link>
                </li>
            </ul>
        </div>
    </nav>
}
