import { useEffect, useState } from "react"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/router"

import { SearchIcon } from "@primer/octicons-react"
import classNames from "classnames"
import { useCombobox } from "downshift"
import { motion, AnimatePresence } from "framer-motion"
import { useLayer } from "react-laag"
import useSWR from "swr"

import * as api from "../../lib/api"
import LoadingSpinner from "../loading.svg"
import verticalMenuStyles from "../VerticalMenu.module.scss" // eslint-disable-line css-modules/no-unused-class

import styles from "./Search.module.scss"

function useRecentScratches(): api.TerseScratch[] {
    const { data, error } = useSWR("/scratch?page_size=5", api.get)

    if (error)
        console.error(error)

    return data?.results || []
}

export default function Search({ className }: { className?: string }) {
    const [query, setQuery] = useState("")
    const [isFocused, setIsFocused] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [debouncedTimeout, setDebouncedTimeout] = useState<any>()
    const [searchItems, setSearchItems] = useState<api.TerseScratch[]>([])
    const recentScratches = useRecentScratches()

    const items = query.length > 0 ? searchItems : recentScratches

    const {
        isOpen,
        getMenuProps,
        getInputProps,
        getComboboxProps,
        getItemProps,
    } = useCombobox({
        items,
        isOpen: isFocused && !(isLoading && items.length === 0),
        itemToString(item) {
            return item.name
        },
        onInputValueChange({ inputValue }) {
            clearTimeout(debouncedTimeout)
            setQuery(inputValue)

            if (inputValue.length === 0) {
                setSearchItems([])
                setIsLoading(false)
                return
            }

            // Use a timeout to avoid spamming the API with requests
            setIsLoading(true)
            setDebouncedTimeout(setTimeout(async () => {
                const resp = await api.get(`/scratch?search=${inputValue}&page_size=5`)
                setSearchItems(resp.results)
                setIsLoading(false)
            }, 200))
        },
    })

    const { renderLayer, triggerProps, layerProps, triggerBounds } = useLayer({
        isOpen,
        overflowContainer: false,
        auto: true,
        snap: true,
        placement: "bottom-start",
        possiblePlacements: ["top-start", "bottom-start"],
        triggerOffset: 0,
        containerOffset: 16,
    })

    const [isMounted, setIsMounted] = useState(false)
    useEffect(() => setIsMounted(true), [])

    const router = useRouter()

    if (!isMounted) {
        return <div className={classNames(styles.container, className)}>
            <SearchIcon className={styles.icon} />
            <input
                className={styles.input}
                type="text"
                placeholder="Search..."
                spellCheck={false}
                value=""
            />
        </div>
    }

    return <div className={classNames(styles.container, className)} {...getComboboxProps()}>
        {!query && <SearchIcon className={styles.icon} />}
        <input
            {...getInputProps(triggerProps)}
            className={classNames(styles.input, {
                [styles.isOpen]: isOpen,
                [styles.noQuery]: !query,
            })}
            type="text"
            placeholder="Search..."
            spellCheck={false}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={evt => {
                if (evt.key === "Enter") {
                    if (items.length > 0)
                        router.push(items[0].html_url)
                }
            }}
        />
        {isLoading && isFocused && <LoadingSpinner className={styles.loadingIcon} />}
        {isMounted && renderLayer(
            <AnimatePresence>
                {isOpen && <motion.ul
                    {...getMenuProps(layerProps)}
                    className={classNames(verticalMenuStyles.menu, styles.results)}
                    style={{
                        width: triggerBounds.width,
                        ...layerProps.style,
                    }}
                    initial={{ opacity: 0, scaleY: 0.75 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0.75 }}
                    transition={{ duration: 0.125 }}
                >
                    {items.map((scratch, index) => (
                        <Link key={scratch.url} href={scratch.html_url}>
                            <a
                                className={verticalMenuStyles.item}
                                {...getItemProps({ item: scratch, index })}
                            >
                                <span className={styles.itemName}>
                                    {scratch.name}
                                </span>
                                {scratch.owner && !api.isAnonUser(scratch.owner) && <Image
                                    src={scratch.owner.avatar_url}
                                    alt={scratch.owner.username}
                                    width={16}
                                    height={16}
                                    className={styles.scratchOwnerAvatar}
                                />}
                            </a>
                        </Link>
                    ))}
                    {items.length === 0 && <div className={classNames(verticalMenuStyles.item, styles.noResults)}>
                        No search results
                    </div>}
                </motion.ul>}
            </AnimatePresence>
        )}
    </div>
}
