import { ChangeEvent, KeyboardEvent } from "react"

import killEvent from "./killEvent"
import styles from "./TimePeriodInput.module.scss"

export type Props = {
    value?: number
    onChange?: (duration: number) => void
    disabled?: boolean
}

export default function TimePeriodInput({ value, onChange, disabled }: Props) {
    const onBlur = (evt: ChangeEvent<HTMLSpanElement>) => {
        if (isNaN(+evt.currentTarget.textContent)) {
            evt.currentTarget.textContent = ""+value // this should never happen, as the user is not allowed to type non-digits
        }
        onChange(+evt.currentTarget.textContent)
    }
    const onKeyPress = (evt: KeyboardEvent<HTMLSpanElement>) => {
        if (isNaN(+evt.key) || disabled) // if active, only allow numbers,
            killEvent(evt) // kill the event otherwise (cancel keypress)

        if (evt.key == "Enter") {
            evt.currentTarget.blur() // submit
        }
    }

    return <span
        className={styles.numberInput}
        contentEditable={!disabled}
        suppressContentEditableWarning={true}
        onBlur={onBlur}
        onKeyPress={onKeyPress}
    >
        {value}
    </span>
}
