import { useEffect, useRef, useState } from "react"

import classNames from "classnames"

import killEvent from "./killEvent"
import styles from "./TimePeriodInput.module.scss"

export type Props = {
    value?: number
    onChange?: (duration: number) => void
    disabled?: boolean
}

export default function TimePeriodInput({ value, onChange, disabled }: Props) {
    const [isEditing, setIsEditing] = useState(false)
    const editableRef = useRef<HTMLSpanElement>()

    useEffect(() => {
        const el = editableRef.current

        if (el) {
            const range = document.createRange()
            range.selectNodeContents(el)
            const sel = window.getSelection()
            sel.removeAllRanges()
            sel.addRange(range)
        }
    }, [isEditing])

    return <span
        ref={editableRef}
        className={classNames(styles.numberInput, { [styles.disabled]: disabled })}
        contentEditable={isEditing && !disabled}
        suppressContentEditableWarning={true}
        onClick={() => setIsEditing(true)}
        onBlur={evt => {
            if (isNaN(+evt.currentTarget.textContent)) {
                evt.currentTarget.textContent = ""+value // this should never happen, as the user is not allowed to type non-digits
            }
            onChange(+evt.currentTarget.textContent)
            setIsEditing(false)
        }}
        onKeyPress={evt => {
            if (isNaN(+evt.key) || disabled) // if active, only allow numbers
                killEvent(evt) // kill the event otherwise (cancel keypress)

            if (evt.key == "Enter") {
                evt.currentTarget.blur() // submit
            }
        }}
    >
        {value}
    </span>
}
