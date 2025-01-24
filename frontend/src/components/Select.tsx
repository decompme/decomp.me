import type { ReactNode, ChangeEventHandler } from "react";

import { ChevronDownIcon } from "@primer/octicons-react";

export type Props = {
    className?: string;
    onChange: ChangeEventHandler<HTMLSelectElement>;
    children: ReactNode;
    value?: string;
};

export default function Select({
    onChange,
    children,
    className,
    value,
}: Props) {
    return (
        <div
            className={`relative inline-flex select-none rounded border border-[var(--g400)] bg-[var(--g200)] px-[10px] py-2 text-[0.8rem] text-[var(--g1600)] ${className}`}
        >
            <select
                onChange={onChange}
                value={value}
                className="!outline-0 flex-1 appearance-none border-0 bg-transparent pr-8 outline-none [&_option]:bg-[var(--g200)] [&_option]:text-[var(--g1600)]"
            >
                {children}
            </select>

            <div className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-[0.6em]">
                <ChevronDownIcon size={16} />
            </div>
        </div>
    );
}
