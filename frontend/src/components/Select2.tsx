import { useEffect, useRef, useState } from "react"

import { ChevronDownIcon } from "@primer/octicons-react"
import classNames from "classnames"

import styles from "./Select.module.scss"

export type Props = {
    options: { [key: string]: string }
    value: string
    className?: string
    onChange: (value: string) => void
    isSearchable?: boolean
}
//
export default function Select({ options, value, onChange, className, isSearchable = false }: Props) {
    const [initValue, setInitValue] = useState(value)
    const [query, setQuery] = useState(value ? options[value] : Object.values(options)[0])
    const [isOpen, setIsOpen] = useState(false)
    const [isModified, setIsModified] = useState(false)
    const minSearchLength = 5
    const inputRef = useRef(null)

    const selectOption = (key: string) => {
        onChange(key)
        setIsOpen(!isOpen)
    }

    const toggle = (e: any) => {
        setIsOpen(e && e.target === inputRef.current)
    }

    const check = () => {
        if (!Object.values(options).includes(query)) {
            onChange(Object.keys(options)[0])
        }
    }

    const filter = (options: { [key: string]: string }) => {
        const entries = Object.entries(options)
        if (!isSearchable || entries.length < minSearchLength || !isModified) {
            return entries
        }
        return entries.filter(
            ([_key, name]) => name.toLowerCase().indexOf(query.toLowerCase()) > -1
        )
    }

    useEffect(() => {
        document.addEventListener("click", toggle)
        return () => document.removeEventListener("click", toggle)
    }, [])

    useEffect(() => {
        if (value !== initValue) {
            setInitValue(value)
            setQuery(value ? options[value] : Object.values(options)[0])
            setIsOpen(false)
            setIsModified(false)
        }
    }, [value, options, onChange, initValue])

    return (
        <div className="inline-table">
            <div className={`${styles.group} ${className}`}>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={event => {
                        setIsModified(true)
                        setQuery(event.target.value)
                    }}
                    onClick={toggle}
                    onBlur={check}
                    autoComplete="off"
                    spellCheck={false}
                    readOnly={isSearchable ? Object.entries(options).length < minSearchLength : true}
                />
                <div className={styles.icon}>
                    <ChevronDownIcon size={16} />
                </div>
            </div>

            <div className={classNames(styles.group, styles.options, { [styles.open]: isOpen })}>
                {filter(options).map(([key, value]) =>
                    <div
                        className={styles.option}
                        onClick={() => {
                            selectOption(key)
                            setIsModified(false)
                        }}
                        key={key}
                    >
                        {value}
                    </div>
                )}
            </div>
        </div>
    )
}
