import { useId, ReactNode } from "react"

import classNames from "classnames"

import NumberInput from "@/components/NumberInput"

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max)
}

export type Props = {
  value: number
  onChange: (value: number) => void
  disabled?: boolean

  label: ReactNode
  description?: ReactNode
  unit?: ReactNode

  min: number
  max: number
  step: number
}

export default function SliderField({ value, onChange, disabled, label, description, unit, min, max, step }: Props) {
    const id = useId()

    return <div
        className={classNames({
            "cursor-not-allowed opacity-50": disabled,
        })}
    >
        <label htmlFor={id} className="select-none font-semibold">
            {label}
        </label>

        <div className="mt-1 select-none text-gray-11">
            <div className="inline-block w-1/6 font-medium">
                <NumberInput
                    value={value}
                    onChange={newValue => onChange(clamp(newValue, min, max))}
                    disabled={disabled}
                />
                {unit}
            </div>

            <div className="inline-flex w-5/6 items-center gap-2 text-xs text-gray-10">
                {min}{unit}
                <input
                    id={id}
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={evt => onChange(clamp(+evt.target.value, min, max))}
                    disabled={disabled}
                    className="w-full focus:ring"
                />
                {max}{unit}
            </div>
        </div>

        {description && <div className="mt-1 text-sm text-gray-11">{description}</div>}
    </div>
}
