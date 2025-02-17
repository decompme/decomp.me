import {
    useId,
    type ReactNode,
    type CSSProperties,
    type HTMLInputTypeAttribute,
} from "react";

import classNames from "classnames";

export type Props = {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;

    label: ReactNode;
    description?: ReactNode;

    placeholder?: string;

    inputStyle?: CSSProperties;

    type?: HTMLInputTypeAttribute;
};

export default function TextField({
    value,
    onChange,
    disabled,
    label,
    description,
    placeholder,
    inputStyle,
    type = "text",
}: Props) {
    const id = useId();

    return (
        <div
            className={classNames({
                "cursor-not-allowed opacity-50": disabled,
            })}
        >
            <label htmlFor={id} className="select-none font-semibold">
                {label}
            </label>
            {description && (
                <div className="mt-1 text-gray-11 text-sm">{description}</div>
            )}
            <input
                id={id}
                type={type}
                value={value}
                onChange={(evt) => onChange(evt.target.value)}
                disabled={disabled}
                placeholder={placeholder}
                spellCheck={false}
                className="mt-1 block w-full rounded border border-gray-6 bg-transparent px-2.5 py-1.5 text-gray-11 text-sm outline-none focus:text-gray-12 focus:placeholder:text-gray-10"
                style={inputStyle}
            />
        </div>
    );
}
