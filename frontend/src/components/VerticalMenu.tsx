import { createContext, ReactNode, useContext, useState } from "react"

import Link from "next/link"

import classNames from "classnames"

import LoadingSpinner from "./loading.svg"
import styles from "./VerticalMenu.module.scss"

const MenuContext = createContext({ close: () => {} })

export default function VerticalMenu({ children, close }: { children: ReactNode, close: () => void }) {
    return <MenuContext.Provider value={{ close }}>
        <ul
            className={styles.menu}
            onClick={evt => {
                // Prevent reopening the menu
                evt.stopPropagation()
            }}
        >
            {children}
        </ul>
    </MenuContext.Provider>
}

export function MenuItem({ children }: { children: ReactNode }) {
    return <li className={styles.item}>
        {children}
    </li>
}

export function ButtonItem({ children, disabled, onClick }: {
    children: ReactNode
    disabled?: boolean
    onClick: () => void | Promise<unknown>
}) {
    const { close } = useContext(MenuContext)
    const [isLoading, setIsLoading] = useState(false)

    return <a
        className={classNames(styles.item, {
            [styles.disabled]: disabled,
        })}
        onClick={async () => {
            if (!disabled) {
                setIsLoading(true)
                await onClick()
                setIsLoading(false)
                close()
            }
        }}
    >
        <div>
            {children}
        </div>
        {isLoading && <LoadingSpinner width={16} height={16} />}
    </a>
}

export function LinkItem({ children, href }: { children: ReactNode, href: string }) {
    const { close } = useContext(MenuContext)

    return <Link href={href}>
        <a
            className={styles.item}
            onClick={_evt => {
                close()
            }}
        >
            {children}
        </a>
    </Link>
}
