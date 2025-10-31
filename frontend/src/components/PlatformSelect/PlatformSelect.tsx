import { PlatformIcon } from "./PlatformIcon";
import clsx from "clsx";

export type Props = {
    platforms: {
        [key: string]: {
            name: string;
            description: string;
        };
    };
    value: string;
    className?: string;
    onChange: (value: string) => void;
};

export default function PlatformSelect({
    platforms,
    value,
    onChange,
    className,
}: Props) {
    return (
        <ul
            className={clsx(
                "grid list-none grid-cols-2 gap-2 md:grid-cols-3",
                className,
            )}
        >
            {Object.entries(platforms).map(([key, platform]) => {
                const isSelected = value === key;

                return (
                    <li
                        key={key}
                        onClick={() => onChange(key)}
                        className={clsx(
                            "flex cursor-pointer select-none items-center gap-3 rounded-md p-3 transition-colors",
                            "border hover:border-[var(--g400)] hover:text-[var(--g2000)]",
                            "group",
                            isSelected
                                ? "border-[var(--g400)] bg-[var(--g300)] text-[var(--g2000)]"
                                : "border-transparent bg-transparent text-var(--g1200)",
                        )}
                    >
                        <PlatformIcon
                            clickable={false}
                            platform={key}
                            className={clsx(
                                "h-10 w-10 filter transition-filter duration-200",
                                "grayscale",
                                "group-hover:grayscale-0",
                                isSelected && "grayscale-0",
                            )}
                        />
                        <div className="flex flex-col gap-1">
                            <div className="font-medium">{platform.name}</div>
                            <div className="text-xs opacity-60">
                                {platform.description}
                            </div>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
