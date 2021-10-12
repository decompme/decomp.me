import { useState } from "react"

import { CpuIcon } from "@primer/octicons-react"
import { motion, AnimatePresence } from "framer-motion"
import { useLayer, Arrow } from "react-laag"

import { useThemeVariable } from "../../lib/hooks"
import Button from "../Button"

import styles from "./CompilerButton.module.css"
import CompilerOpts, { Props as CompilerOptsProps } from "./CompilerOpts"

export type Props = {
    arch: CompilerOptsProps["arch"],
    value: CompilerOptsProps["value"],
    onChange: CompilerOptsProps["onChange"],
    disabled?: boolean,
}

export default function CompilerButton({ arch, value, onChange, disabled }: Props) {
    const [isOpen, setOpen] = useState(false)
    const arrowColor = useThemeVariable("--g300")
    const arrowBorderColor = useThemeVariable("--g500")

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
        <Button
            {...triggerProps}
            onClick={() => {
                if (!disabled)
                    setOpen(!isOpen)
            }}
            disabled={disabled}
        >
            <CpuIcon size={16} />
            Compiler...
        </Button>

        {renderLayer(
            <AnimatePresence>
                {isOpen && <motion.div
                    className={styles.popover}
                    initial={{ y: -50, scaleX: 0.7, scaleY: 0, opacity: 0 }}
                    animate={{ y: 0, scaleX: 1, scaleY: 1, opacity: 1 }}
                    exit={{ y: -50, scaleX: 0.7, scaleY: 0, opacity: 0 }}
                    transition={{ type: "spring", duration: 0.3 }}
                    {...layerProps}
                >
                    <CompilerOpts isPopup={true} arch={arch} value={value} onChange={onChange} />
                    <Arrow
                        size={12}
                        backgroundColor={arrowColor}
                        borderWidth={1}
                        borderColor={arrowBorderColor}
                        {...arrowProps}
                    />
                </motion.div>}
            </AnimatePresence>
        )}
    </>
}
