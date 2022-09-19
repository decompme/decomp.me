/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react"

import { UploadIcon } from "@primer/octicons-react"
import classNames from "classnames"

import styles from "./ImageInput.module.scss"

export interface Props {
    file: File
    fallbackUrl?: string
    onChange: (file: File) => void
    className?: string
}

export default function ImageInput({ file, fallbackUrl, onChange, className }: Props) {
    const input = useRef<HTMLInputElement>()

    const [objectUrl, setObjectUrl] = useState<string>(fallbackUrl)
    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file)
            setObjectUrl(url)
            return () => URL.revokeObjectURL(url)
        } else {
            setObjectUrl(fallbackUrl)
        }
    }, [fallbackUrl, file])

    return <div
        className={classNames(styles.container, className)}
        onClick={() => input.current.click()}
        onDrop={evt => {
            evt.preventDefault()
            onChange(evt.dataTransfer.files[0])
        }}
    >
        <input
            ref={input}
            type="file"
            accept="image/*"
            onChange={evt => {
                onChange(evt.target.files[0])
            }}
        />
        {objectUrl && <img alt="" src={objectUrl} />}
        <UploadIcon className={styles.uploadIcon} size={16} />
    </div>
}
