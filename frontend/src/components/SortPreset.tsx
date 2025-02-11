import Select from "@/components/Select2";

export enum SortMode {
    NEWEST_FIRST = "-creation_time",
    OLDEST_FIRST = "creation_time",
    MOST_SCRATCHES = "-num_scratches",
    FEWEST_SCRATCHES = "num_scratches",
    ALPHABETICAL_AZ = "name",
    ALPHABETICAL_ZA = "-name",
}

export type Props = {
    className?: string;
    sortMode: SortMode;
    setSortMode: (m: SortMode) => void;
};

export default function SortBy({ sortMode, setSortMode }: Props) {
    return (
        <div>
            <span className="mr-2 text-gray-11 text-xs">Sort by</span>
            <Select
                value={sortMode}
                onChange={(m) => {
                    setSortMode(m as SortMode);
                }}
                options={{
                    [SortMode.NEWEST_FIRST]: "Newest first",
                    [SortMode.OLDEST_FIRST]: "Oldest first",
                    [SortMode.MOST_SCRATCHES]: "Most scratches",
                    [SortMode.FEWEST_SCRATCHES]: "Fewest scratches",
                    [SortMode.ALPHABETICAL_AZ]: "Alphabetical A-Z",
                    [SortMode.ALPHABETICAL_ZA]: "Alphabetical Z-A",
                }}
            />
        </div>
    );
}
