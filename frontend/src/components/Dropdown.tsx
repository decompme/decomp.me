import { ReactNode, useCallback, useEffect, useRef, useState } from "react"

import classNames from "classnames"

import styles from "./Dropdown.module.scss"

export type Props = {
    options: { [key: string]: (event: any) => void }
    className?: string
    children: ReactNode
}

export default function Dropdown({ options, children, className }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const ref = useRef(null)

    const toggleDropdown = () => {
        setIsOpen(!isOpen)
    }

    const closeDropdown = useCallback(() => {
        setIsOpen(false)
    }, [])

    useEffect(() => {
        const listener = event => {
            if (!ref?.current || ref.current.contains(event.target)) {
                return
            }
            closeDropdown()
        }

        document.addEventListener("mousedown", listener)
        document.addEventListener("touchstart", listener)
        return () => {
            document.removeEventListener("mousedown", listener)
            document.addEventListener("touchstart", listener)
        }
    }, [closeDropdown, ref])

    return (
        <div ref={ref} className="inline-table">
            <button className={className} onClick={toggleDropdown}>
                {children}
            </button>
            <div className={classNames(styles.options, { [styles.open]: isOpen })}>
                {Object.entries(options).map(([value, onChange]) =>
                    <button
                        className={styles.option}
                        onClick={event => {
                            onChange(event)
                            closeDropdown()
                        }}
                        key={value}
                    >
                        {value}
                    </button>
                )}
            </div>
        </div>
    )
}
