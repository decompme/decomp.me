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
                "grid grid-cols-2 md:grid-cols-3 gap-2 list-none",
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
                            "flex items-center gap-3 p-3 rounded-md cursor-pointer select-none transition-colors",
                            "border border-transparent hover:border-[var(--g400)]",
                            "text-var(--g1200) hover:text-[var(--g2000)]",
                            "bg-transparent",
                            "group",
                            {
                                "border-[var(--g400)] text-[var(--g2000)] bg-[var(--g300)]":
                                    isSelected,
                            },
                        )}
                    >
                        <PlatformIcon
                            clickable={false}
                            platform={key}
                            className={clsx(
                                "w-10 h-10 transition-filter duration-200 filter",
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
