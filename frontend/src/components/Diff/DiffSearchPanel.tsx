import {
    ChevronDownIcon,
    ChevronUpIcon,
    SearchIcon,
    XIcon,
} from "@primer/octicons-react";

import styles from "./Diff.module.scss";

type Props = {
    query: string;
    inputRef: React.RefObject<HTMLInputElement>;
    activeIndex: number;
    matchCount: number;
    capped: boolean;
    isSettled: boolean;
    onQueryChange: (query: string) => void;
    onPrevious: () => void;
    onNext: () => void;
    onClose: () => void;
};

export default function DiffSearchPanel({
    query,
    inputRef,
    activeIndex,
    matchCount,
    capped,
    isSettled,
    onQueryChange,
    onPrevious,
    onNext,
    onClose,
}: Props) {
    const hasMatches = isSettled && matchCount > 0;

    return (
        <div className={styles.searchPanel}>
            <SearchIcon size={14} className={styles.searchPanelIcon} />
            <input
                ref={inputRef}
                className={styles.searchInput}
                value={query}
                placeholder="Search diff"
                spellCheck={false}
                onChange={(event) => onQueryChange(event.currentTarget.value)}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        if (event.shiftKey) {
                            onPrevious();
                        } else {
                            onNext();
                        }
                    } else if (event.key === "Escape") {
                        event.preventDefault();
                        onClose();
                    }
                }}
            />
            <span className={styles.searchCount}>
                {hasMatches
                    ? `${activeIndex + 1}/${matchCount}${capped ? "+" : ""}`
                    : "0/0"}
            </span>
            <button
                type="button"
                className={styles.searchPanelButton}
                aria-label="Previous diff search result"
                title="Previous result"
                disabled={!hasMatches}
                onClick={onPrevious}
            >
                <ChevronUpIcon size={16} />
            </button>
            <button
                type="button"
                className={styles.searchPanelButton}
                aria-label="Next diff search result"
                title="Next result"
                disabled={!hasMatches}
                onClick={onNext}
            >
                <ChevronDownIcon size={16} />
            </button>
            <button
                type="button"
                className={styles.searchPanelButton}
                aria-label="Close diff search"
                title="Close search"
                onClick={onClose}
            >
                <XIcon size={16} />
            </button>
        </div>
    );
}
