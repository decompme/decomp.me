import { useEffect, useRef, useState } from "react";

import styles from "./DragBar.module.scss";

export interface Props {
    pos: number;
    onChange: (pos: number) => void;
}

export default function DragBar({ pos, onChange }: Props) {
    const [isActive, setIsActive] = useState(false);
    const ref = useRef<HTMLDivElement>();

    useEffect(() => {
        const onMouseMove = (evt: MouseEvent) => {
            if (isActive) {
                const parent = ref.current.parentElement;
                if (parent)
                    onChange(evt.clientX - parent.getBoundingClientRect().x);
            }
        };

        const onTouchMove = (evt: TouchEvent) => {
            if (isActive) {
                const parent = ref.current.parentElement;
                if (parent) {
                    const touch = evt.touches[0];
                    onChange(touch.clientX - parent.getBoundingClientRect().x);
                }
            }
        };

        const onMouseUp = () => {
            setIsActive(false);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        document.addEventListener("touchmove", onTouchMove);
        document.addEventListener("touchend", onMouseUp);

        return () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("touchend", onMouseUp);
        };
    });

    return (
        <div
            ref={ref}
            className={`${styles.vertical} ${isActive && styles.active}`}
            style={{ left: `${pos}px` }}
            onMouseDown={() => setIsActive(true)}
            onTouchMove={() => setIsActive(true)}
        />
    );
}
