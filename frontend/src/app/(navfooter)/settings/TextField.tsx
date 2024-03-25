import { useId, ReactNode, CSSProperties } from "react"

import classNames from "classnames"

export type Props = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean

  label: ReactNode
  description?: ReactNode

  placeholder?: string

  inputStyle?: CSSProperties
}

export default function TextField({ value, onChange, disabled, label, description, placeholder, inputStyle }: Props) {
    const id = useId()

    return <div
        className={classNames({
            "cursor-not-allowed opacity-50": disabled,
        })}
    >
        <label htmlFor={id} className="select-none font-semibold">
            {label}
        </label>
        {description && <div className="mt-1 text-sm text-gray-11">{description}</div>}
        <input
            id={id}
            type="text"
            value={value}
            onChange={evt => onChange(evt.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            spellCheck={false}
            className="mt-1 block w-full rounded border border-gray-6 bg-transparent px-2.5 py-1.5 text-sm text-gray-11 outline-none focus:text-gray-12 focus:placeholder:text-gray-10"
            style={inputStyle}
        />
    </div>
}
