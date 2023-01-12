import { useEffect, useRef, useState } from "react"

import Image from "next/image"
import { useRouter } from "next/navigation"

import { SearchIcon } from "@primer/octicons-react"
import classNames from "classnames"
import { useCombobox } from "downshift"
import { useLayer } from "react-laag"

import * as api from "@/lib/api"

import LoadingSpinner from "../loading.svg"
import ScratchIcon from "../ScratchIcon"
import AnonymousFrogAvatar from "../user/AnonymousFrog"
import verticalMenuStyles from "../VerticalMenu.module.scss" // eslint-disable-line css-modules/no-unused-class

import styles from "./Search.module.scss"

function MountedSearch({ className }: { className?: string }) {
    const [query, setQuery] = useState("")
    const [isFocused, setIsFocused] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [debouncedTimeout, setDebouncedTimeout] = useState<any>()
    const [searchItems, setSearchItems] = useState<api.TerseScratch[]>([])

    const items = query.length > 0 ? searchItems : []

    const close = () => {
        console.info("<Search> close")
        setInputValue("")
        setQuery("")
        setIsFocused(false)
    }

    const {
        isOpen,
        getMenuProps,
        getInputProps,
        getComboboxProps,
        getItemProps,
        setInputValue,
    } = useCombobox({
        items,
        isOpen: (isFocused || !!query) && query.length > 0 && !(isLoading && items.length === 0),
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
        onSelectedItemChange({ selectedItem }) {
            if (selectedItem) {
                console.info("<Search> onSelectedItemChange")
                close()
                router.push(selectedItem.html_url)
            }
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
        onOutsideClick() {
            console.info("<Search> onOutsideClick")
            close()
        },
    })

    const router = useRouter()

    const lastWidthRef = useRef(0)
    if (triggerBounds) {
        lastWidthRef.current = triggerBounds.width
    }

    return <div
        className={classNames(styles.container, className)}
        {...getComboboxProps()}
        onKeyDown={evt => {
            if (evt.key === "Enter") {
                evt.stopPropagation()
                evt.preventDefault()

                if (searchItems.length > 0) {
                    console.info("<Search> Enter pressed")
                    close()
                    router.push(searchItems[0].html_url)
                }
            }
        }}
    >
        <SearchIcon className={styles.icon} />
        <input
            {...getInputProps(triggerProps)}
            className={classNames(styles.input, {
                [styles.isOpen]: isOpen,
                "rounded-md bg-transparent text-sm placeholder-current hover:bg-gray-4 focus:bg-gray-5 focus:placeholder-gray-11 transition-colors": true,
            })}
            type="text"
            placeholder="Search scratches"
            spellCheck={false}
            onFocus={() => setIsFocused(true)}
            onClick={() => setIsFocused(true)}
        />
        {isLoading && isFocused && <LoadingSpinner className={styles.loadingIcon} />}
        {renderLayer(
            <ul
                {...getMenuProps(layerProps)}
                className={classNames(verticalMenuStyles.menu, styles.results, {
                    [styles.isOpen]: isOpen,
                })}
                style={{
                    width: lastWidthRef.current,
                    ...layerProps.style,
                }}
            >
                {items.map((scratch, index) => {
                    const props = getItemProps({ item: scratch, index })
                    const oldOnClick = props.onClick
                    props.onClick = evt => {
                        evt.preventDefault() // Don't visit the link
                        return oldOnClick(evt)
                    }

                    return <li
                        key={scratch.url}
                        {...props}
                    >
                        <a
                            href={scratch.html_url}
                            className={classNames(verticalMenuStyles.item, styles.item)}
                        >
                            <ScratchIcon scratch={scratch} size={16} />
                            <span className={styles.itemName}>
                                {scratch.name}
                            </span>
                            {scratch.owner && (!api.isAnonUser(scratch.owner) ?
                                scratch.owner.avatar_url && <Image
                                    src={scratch.owner.avatar_url}
                                    alt={scratch.owner.username}
                                    width={16}
                                    height={16}
                                    className={styles.scratchOwnerAvatar}
                                /> :
                                <AnonymousFrogAvatar
                                    user={scratch.owner}
                                    width={16}
                                    height={16}
                                    className={styles.scratchOwnerAvatar}
                                />)}
                        </a>
                    </li>
                })}
                {items.length === 0 && <li>
                    <div className={classNames(verticalMenuStyles.item, styles.noResults)}>
                        No search results
                    </div>
                </li>}
            </ul>
        )}
    </div>
}

export default function Search({ className }: { className?: string }) {
    const [isMounted, setIsMounted] = useState(false)
    useEffect(() => setIsMounted(true), [])

    if (!isMounted) {
        return null
    }

    return <MountedSearch className={className} />
}
