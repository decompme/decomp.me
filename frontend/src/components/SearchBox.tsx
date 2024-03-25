import { useState } from "react"

import { SearchIcon } from "@primer/octicons-react"
import classNames from "classnames"
import { useDebouncedCallback } from "use-debounce"

import Loading from "./loading.svg"
import styles from "./SearchBox.module.scss"

export type Props = {
    onSearch: (searchTerm: string) => void
    placeholder?: string
    isLoading?: boolean
    className?: string
    searchAfterTimeout?: number
}

export default function SearchBox({ onSearch, placeholder, isLoading, className, searchAfterTimeout }: Props) {
    const [value, setValue] = useState("")
    const debouncedSearch = useDebouncedCallback(() => {
        onSearch(value)
    }, searchAfterTimeout || 0, { leading: false, trailing: true })

    return <div className={classNames(styles.container, className)}>
        {isLoading ? <Loading /> : <SearchIcon />}
        <input
            type="text"
            value={value}
            placeholder={placeholder}
            spellCheck={false}
            onChange={e => {
                setValue(e.target.value)

                if (typeof searchAfterTimeout === "number")
                    debouncedSearch()
            }}
            onBlur={() => {
                if (typeof searchAfterTimeout === "number")
                    debouncedSearch.flush()
                else
                    onSearch(value)
            }}
            onKeyDown={e => {
                if (e.key === "Enter") {
                    if (typeof searchAfterTimeout === "number")
                        debouncedSearch.flush()
                    else
                        onSearch(value)
                }
            }}
        />
    </div>
}
