import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { SearchIcon } from "@primer/octicons-react";
import clsx from "clsx";
import { useCombobox } from "downshift";
import { useLayer } from "react-laag";
import { useDebounce } from "use-debounce";

import * as api from "@/lib/api";
import { scratchUrl, userHtmlUrl, presetUrl } from "@/lib/api/urls";

import LoadingSpinner from "../loading.svg";
import verticalMenuStyles from "../VerticalMenu.module.scss"; // eslint-disable-line css-modules/no-unused-class

import { getMatchPercentString, ScratchOwnerAvatar } from "../ScratchItem";

import styles from "./Search.module.scss";
import { PlatformIcon } from "../PlatformSelect/PlatformIcon";
import UserAvatar from "../user/UserAvatar";

const SEARCH_DEBOUNCE_MS = 200;
const SEARCH_PAGE_SIZE = 5;

function HighlightedMatch({ text, query }: { text: string; query: string }) {
    if (!query) {
        return text;
    }

    const index = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
    if (index === -1) {
        return text;
    }

    const before = text.slice(0, index);
    const match = text.slice(index, index + query.length);
    const after = text.slice(index + query.length);

    return (
        <>
            {before}
            <strong className={styles.match}>{match}</strong>
            {after}
        </>
    );
}

function useSearchResults(query: string): {
    isLoading: boolean;
    searchItems: api.SearchResult[];
    resultQuery: string;
} {
    const latestQuery = useRef(query);
    const [debouncedQuery] = useDebounce(query, SEARCH_DEBOUNCE_MS, {
        leading: false,
        trailing: true,
    });
    const [searchItems, setSearchItems] = useState<api.SearchResult[]>([]);
    const [resultQuery, setResultQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    latestQuery.current = query;

    useEffect(() => {
        if (query.length === 0) {
            setSearchItems([]);
            setResultQuery("");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
    }, [query]);

    useEffect(() => {
        if (debouncedQuery.length === 0) {
            return;
        }

        let isCurrent = true;
        const search = encodeURIComponent(debouncedQuery);

        api.get(`/search?search=${search}&page_size=${SEARCH_PAGE_SIZE}`).then(
            (resp) => {
                if (isCurrent && latestQuery.current === debouncedQuery) {
                    setSearchItems(resp);
                    setResultQuery(debouncedQuery);
                    setIsLoading(false);
                }
            },
        );

        return () => {
            isCurrent = false;
        };
    }, [debouncedQuery]);

    return { isLoading, searchItems, resultQuery };
}

function MountedSearch({ className }: { className?: string }) {
    const [query, setQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const { isLoading, searchItems, resultQuery } = useSearchResults(query);

    const items = query.length > 0 ? searchItems : [];

    const close = () => {
        console.info("<Search> close");
        setInputValue("");
        setQuery("");
        setIsFocused(false);
    };

    const router = useRouter();

    const pushRoute = (item: api.SearchResult) => {
        switch (item.type) {
            case "scratch":
                router.push(scratchUrl(item.item));
                break;
            case "user":
                router.push(userHtmlUrl(item.item));
                break;
            case "preset":
                router.push(presetUrl(item.item));
                break;
        }
    };

    const { isOpen, getMenuProps, getInputProps, getItemProps, setInputValue } =
        useCombobox({
            items,
            isOpen:
                (isFocused || !!query) &&
                query.length > 0 &&
                !(isLoading && items.length === 0),
            itemToString(item) {
                switch (item.type) {
                    case "scratch":
                    case "preset":
                        return item.item.name;
                    case "user":
                        return item.item.username;
                    default:
                        return "";
                }
            },
            onInputValueChange({ inputValue }) {
                setQuery(inputValue);
            },
            onSelectedItemChange({ selectedItem }) {
                if (selectedItem) {
                    console.info("<Search> onSelectedItemChange");
                    close();
                    pushRoute(selectedItem);
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
                        pushRoute(searchItems[0]);
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
                placeholder="Search decomp.me"
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
                    {items.map((item, index) => {
                        const props = getItemProps({ item, index });
                        const oldOnClick = props.onClick;
                        props.onClick = (evt) => {
                            evt.preventDefault(); // Don't visit the link
                            return oldOnClick(evt);
                        };

                        switch (item.type) {
                            case "scratch": {
                                const scratch = item.item;
                                return (
                                    <li key={scratchUrl(scratch)} {...props}>
                                        <a
                                            href={scratchUrl(scratch)}
                                            className={clsx(
                                                verticalMenuStyles.item,
                                                styles.item,
                                            )}
                                        >
                                            <PlatformIcon
                                                platform={scratch.platform}
                                                className="w-[1.2em]"
                                            />
                                            <span className={styles.itemName}>
                                                <HighlightedMatch
                                                    text={scratch.name}
                                                    query={resultQuery}
                                                />
                                            </span>
                                            <span>
                                                {getMatchPercentString(scratch)}
                                            </span>
                                            <ScratchOwnerAvatar
                                                scratch={scratch}
                                            />
                                        </a>
                                    </li>
                                );
                            }
                            case "user": {
                                const user = item.item;
                                return (
                                    <li key={userHtmlUrl(user)} {...props}>
                                        <a
                                            href={userHtmlUrl(user)}
                                            className={clsx(
                                                verticalMenuStyles.item,
                                                styles.item,
                                            )}
                                        >
                                            <UserAvatar user={user} />
                                            <span className={styles.itemName}>
                                                <HighlightedMatch
                                                    text={user.username}
                                                    query={resultQuery}
                                                />
                                            </span>
                                        </a>
                                    </li>
                                );
                            }
                            case "preset": {
                                const preset = item.item;
                                return (
                                    <li key={presetUrl(preset)} {...props}>
                                        <a
                                            href={presetUrl(preset)}
                                            className={clsx(
                                                verticalMenuStyles.item,
                                                styles.item,
                                            )}
                                        >
                                            <PlatformIcon
                                                platform={preset.platform}
                                                className="w-[1.2em]"
                                            />
                                            <span className={styles.itemName}>
                                                <HighlightedMatch
                                                    text={preset.name}
                                                    query={resultQuery}
                                                />
                                            </span>
                                            {preset.num_scratches > 1
                                                ? `${preset.num_scratches.toLocaleString("en-US")} scratches`
                                                : preset.num_scratches > 0
                                                  ? `${preset.num_scratches} scratch`
                                                  : "No scratches"}
                                        </a>
                                    </li>
                                );
                            }
                        }
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
