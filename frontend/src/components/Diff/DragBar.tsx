import { useEffect, useRef, useState } from "react"

import styles from "./DragBar.module.scss"

export interface Props {
    pos: number
    onChange: (pos: number) => void
}

export default function DragBar({ pos, onChange }: Props) {
    const [isActive, setIsActive] = useState(false)
    const ref = useRef<HTMLDivElement>()

    useEffect(() => {
        const onMouseMove = (evt: MouseEvent) => {
            if (isActive) {
                const parent = ref.current.parentElement
                onChange(evt.clientX - parent.getBoundingClientRect().x)
            }
        }

        const onMouseUp = () => {
            setIsActive(false)
        }

        document.addEventListener("mousemove", onMouseMove)
        document.addEventListener("mouseup", onMouseUp)

        return () => {
            document.removeEventListener("mousemove", onMouseMove)
            document.removeEventListener("mouseup", onMouseUp)
        }
    })

    return <div
        ref={ref}
        className={styles.vertical}
        style={{ left: `${pos}px` }}
        onMouseDown={() => setIsActive(true)}
    />
}
