import { type ReactNode, useId } from "react";

export type Props = {
    checked: boolean;
    onChange: (checked: boolean) => void;

    label: ReactNode;
    description?: ReactNode;
    children?: ReactNode;
};

export default function Checkbox({
    checked,
    onChange,
    label,
    description,
    children,
}: Props) {
    const id = useId();

    return (
        <div className="flex gap-2">
            <div>
                <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={(evt) => onChange(evt.target.checked)}
                />
            </div>
            <div className="grow">
                <label htmlFor={id} className="select-none font-semibold">
                    {label}
                </label>
                {description && (
                    <div className="text-gray-11 text-sm">{description}</div>
                )}
                {children && <div className="pt-3">{children}</div>}
            </div>
        </div>
    );
}
