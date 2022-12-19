import { useEffect, useRef, useState } from "react"

import classNames from "classnames"

import styles from "./StringInput.module.scss"

export type Props = {
    value: string
    onChange: (value: string) => void
    label: string
    isValidKey?: (key: string) => boolean
    disabled?: boolean
    className?: string
}

export default function StringInput({ value, onChange, isValidKey, label, disabled, className }: Props) {
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
        title={label}
        tabIndex={0}
        className={classNames(styles.input, { [styles.disabled]: disabled }, className)}
        contentEditable={isEditing && !disabled}
        suppressContentEditableWarning={true}
        spellCheck={false}
        onClick={() => setIsEditing(true)}
        onBlur={evt => {
            onChange(evt.currentTarget.textContent)
            setIsEditing(false)
        }}
        onKeyPress={evt => {
            const v = isValidKey ? isValidKey(evt.key) : true
            if (!v || disabled) {
                evt.preventDefault()
            }

            if (evt.key == "Enter") {
                evt.currentTarget.blur() // submit
            }
        }}
        onPaste={evt => evt.preventDefault()}
    >
        {isEditing ? editableRef.current.textContent : value}
    </span>
}
