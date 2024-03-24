import { ReactNode, useId } from "react"

export type Option = {
    label: ReactNode
    description?: ReactNode
    children?: ReactNode
}

export type Props = {
    value: string
    onChange: (value: string) => void
    options: { [key: string]: Option }
}

function RadioButton({ name, value, checked, onChange, option }: { name: string, value: string, checked: boolean, onChange: (value: string) => void, option: Option }) {
    const id = useId()

    return <div className="flex gap-2">
        <div>
            <input
                id={id}
                name={name}
                value={value}
                type="radio"
                checked={checked}
                onChange={evt => onChange(evt.target.value)}
            />
        </div>
        <div className="grow">
            <label htmlFor={id} className="select-none font-semibold">{option.label}</label>
            {option.description && <div className="text-sm text-gray-11">{option.description}</div>}
            {option.children && <div className="pt-3">
                {option.children}
            </div>}
        </div>
    </div>
}

export default function RadioList({ value, onChange, options }: Props) {
    const name = useId()

    return Object.keys(options).map(key => {
        return <RadioButton
            name={name}
            key={key}
            value={key}
            checked={key === value}
            option={options[key]}
            onChange={onChange}
            />
    })
}
