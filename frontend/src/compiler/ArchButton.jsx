import { h, Fragment } from "preact"
import { useState } from "preact/hooks"
import { useLayer, Arrow } from "react-laag"
import { motion, AnimatePresence } from "framer-motion"
import { CpuIcon } from "@primer/octicons-react"

import ArchOpts from "./ArchOpts"
import styles from "./CompilerButton.module.css"

export default function ArchButton({ value, onChange }) {
    const [isOpen, setOpen] = useState(false)

    const close = () => setOpen(false)

    const { renderLayer, triggerProps, layerProps, arrowProps } = useLayer({
        isOpen,
        onOutsideClick: close,
        overflowContainer: false,
        auto: true,
        placement: "bottom-end", 
        triggerOffset: 14,
    })

    return <>
        <button {...triggerProps} onClick={() => setOpen(!isOpen)} style={isOpen && { color: "#fff" }}>
            <CpuIcon size={16} />
            Arch...
        </button>

        {renderLayer(
            <AnimatePresence>
                {isOpen && <motion.div
                    class={styles.popover}
                    initial={{ y: -50, scaleX: 0.7, scaleY: 0, opacity: 0 }}
                    animate={{ y: 0, scaleX: 1, scaleY: 1, opacity: 1 }}
                    exit={{ y: -50, scaleX: 0.7, scaleY: 0, opacity: 0 }}
                    transition={{ type: "spring", duration: 0.3 }}
                    {...layerProps}
                >
                    <ArchOpts value={value} onChange={onChange} />
                    <Arrow size={12} backgroundColor="#22272d" {...arrowProps} />
                </motion.div>}
            </AnimatePresence>
        )}
    </>
}
