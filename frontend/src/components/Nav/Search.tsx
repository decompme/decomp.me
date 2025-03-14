import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { SearchIcon } from "@primer/octicons-react";
import clsx from "clsx";
import { useCombobox } from "downshift";
import { useLayer } from "react-laag";

import * as api from "@/lib/api";
import { scratchUrl } from "@/lib/api/urls";

import LoadingSpinner from "../loading.svg";
import PlatformLink from "../PlatformLink";
import verticalMenuStyles from "../VerticalMenu.module.scss"; // eslint-disable-line css-modules/no-unused-class

import { getMatchPercentString, ScratchOwnerAvatar } from "../ScratchItem";

import styles from "./Search.module.scss";

function MountedSearch({ className }: { className?: string }) {
    const [query, setQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [debouncedTimeout, setDebouncedTimeout] = useState<any>();
    const [searchItems, setSearchItems] = useState<api.TerseScratch[]>([]);

    const items = query.length > 0 ? searchItems : [];

    const close = () => {
        console.info("<Search> close");
        setInputValue("");
        setQuery("");
        setIsFocused(false);
    };

    const { isOpen, getMenuProps, getInputProps, getItemProps, setInputValue } =
        useCombobox({
            items,
            isOpen:
                (isFocused || !!query) &&
                query.length > 0 &&
                !(isLoading && items.length === 0),
            itemToString(item) {
                return item.name;
            },
            onInputValueChange({ inputValue }) {
                clearTimeout(debouncedTimeout);
                setQuery(inputValue);

                if (inputValue.length === 0) {
                    setSearchItems([]);
                    setIsLoading(false);
                    return;
                }

                // Use a timeout to avoid spamming the API with requests
                setIsLoading(true);
                setDebouncedTimeout(
                    setTimeout(async () => {
                        const resp = await api.get(
                            `/scratch?search=${inputValue}&page_size=5`,
                        );
                        setSearchItems(resp.results);
                        setIsLoading(false);
                    }, 200),
                );
            },
            onSelectedItemChange({ selectedItem }) {
                if (selectedItem) {
                    console.info("<Search> onSelectedItemChange");
                    close();
                    router.push(scratchUrl(selectedItem));
                }
            },
        });

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
            console.info("<Search> onOutsideClick");
            close();
        },
    });

    const router = useRouter();

    const lastWidthRef = useRef(0);
    if (triggerBounds) {
        lastWidthRef.current = triggerBounds.width;
    }

    return (
        <div
            className={clsx(styles.container, className)}
            onKeyDown={(evt) => {
                if (evt.key === "Enter") {
                    evt.stopPropagation();
                    evt.preventDefault();

                    if (searchItems.length > 0) {
                        console.info("<Search> Enter pressed");
                        close();
                        router.push(scratchUrl(searchItems[0]));
                    }
                }
            }}
        >
            <SearchIcon className={styles.icon} />
            <input
                {...getInputProps(triggerProps)}
                className={clsx(styles.input, {
                    [styles.isOpen]: isOpen,
                    "rounded-md bg-transparent text-sm placeholder-current transition-colors hover:bg-gray-4 focus:bg-gray-5 focus:placeholder-gray-11": true,
                })}
                type="text"
                placeholder="Search scratches"
                spellCheck={false}
                onFocus={() => setIsFocused(true)}
                onClick={() => setIsFocused(true)}
            />
            {isLoading && isFocused && (
                <LoadingSpinner className={styles.loadingIcon} />
            )}
            {renderLayer(
                <ul
                    {...getMenuProps(layerProps)}
                    className={clsx(verticalMenuStyles.menu, styles.results, {
                        [styles.isOpen]: isOpen,
                    })}
                    style={{
                        width: lastWidthRef.current,
                        ...layerProps.style,
                    }}
                >
                    {items.map((scratch, index) => {
                        const props = getItemProps({ item: scratch, index });
                        const oldOnClick = props.onClick;
                        props.onClick = (evt) => {
                            evt.preventDefault(); // Don't visit the link
                            return oldOnClick(evt);
                        };

                        return (
                            <li key={scratchUrl(scratch)} {...props}>
                                <a
                                    href={scratchUrl(scratch)}
                                    className={clsx(
                                        verticalMenuStyles.item,
                                        styles.item,
                                    )}
                                >
                                    <PlatformLink scratch={scratch} size={16} />
                                    <span className={styles.itemName}>
                                        {scratch.name}
                                    </span>
                                    <span>
                                        {getMatchPercentString(scratch)}
                                    </span>
                                    <ScratchOwnerAvatar scratch={scratch} />
                                </a>
                            </li>
                        );
                    })}
                    {items.length === 0 && (
                        <li>
                            <div
                                className={clsx(
                                    verticalMenuStyles.item,
                                    styles.noResults,
                                )}
                            >
                                No search results
                            </div>
                        </li>
                    )}
                </ul>,
            )}
        </div>
    );
}

export default function Search({ className }: { className?: string }) {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    if (!isMounted) {
        return null;
    }

    return <MountedSearch className={className} />;
}
