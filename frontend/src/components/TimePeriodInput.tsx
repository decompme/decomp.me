import { ChangeEvent, KeyboardEvent } from "react"

import killEvent from "./killEvent"
import styles from "./TimePeriodInput.module.scss"

export default function TimePeriodInput({ value, onChange, disabled }: { value?: number, onChange?: (duration: number) => void, disabled: boolean }) {
    const onBlur = (evt: ChangeEvent<HTMLLabelElement>) => {
        if (isNaN(+evt.currentTarget.textContent)) {
            evt.currentTarget.textContent = ""+value // this should never happen, as the user is not allowed to type non-digits
        }
        onChange(+evt.currentTarget.textContent)
    }
    const onKeyPress = (evt: KeyboardEvent<HTMLLabelElement>) => {
        if (isNaN(+evt.key) || disabled) // if active, only allow numbers,
            killEvent(evt) // kill the event otherwise (cancel keypress)

        if (evt.key == "Enter") {
            evt.currentTarget.blur() // submit
        }
    }

    return <label className={styles.numberInput}
        contentEditable={!disabled} suppressContentEditableWarning={true}
        onBlur={onBlur} onKeyPress={onKeyPress}>{value}</label>
}
