import { useEffect, useRef, useState } from "react"

import classNames from "classnames"

import styles from "./NumberInput.module.scss"

export type Props = {
    value?: number
    onChange?: (value: number) => void
    stringValue?: string
    disabled?: boolean
}

export default function NumberInput({ value, onChange, stringValue, disabled }: Props) {
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
        tabIndex={0}
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
            const isValidKey = evt.key == "." || !isNaN(+evt.key)
            if (!isValidKey || disabled) {
                evt.preventDefault()
            }

            if (evt.key == "Enter") {
                evt.currentTarget.blur() // submit
            }
        }}
    >
        {isEditing ? editableRef.current.textContent : (stringValue ?? value)}
    </span>
}
