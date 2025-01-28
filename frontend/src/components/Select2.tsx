import { useEffect } from "react";
import { ChevronDownIcon } from "@primer/octicons-react";

export type Props = {
    options: { [key: string]: string };
    value: string;
    className?: string;
    onChange: (value: string) => void;
};

export default function Select({ options, value, onChange, className }: Props) {
    useEffect(() => {
        if (!value) onChange(Object.keys(options)[0]);
    }, [value, options, onChange]);

    return (
        <div
            className={`relative inline-flex select-none rounded border border-[var(--g400)] bg-[var(--g200)] px-[10px] py-2 text-[0.8rem] text-[var(--g1600)] ${className}`}
        >
            <select
                value={value}
                onChange={(event) => {
                    onChange(event.target.value);
                }}
                className="!outline-0 flex-1 appearance-none border-0 bg-transparent pr-8 outline-none [&_option]:bg-[var(--g200)] [&_option]:text-[var(--g1600)]"
            >
                {Object.entries(options).map(([key, name]) => (
                    <option key={key} value={key}>
                        {name}
                    </option>
                ))}
            </select>

            <div className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-[0.6em]">
                <ChevronDownIcon size={16} />
            </div>
        </div>
    );
}
