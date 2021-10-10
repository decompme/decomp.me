import { ReactNode, useState, useCallback } from "react"
import { useLayer, Arrow } from "react-laag"
import { motion, AnimatePresence } from "framer-motion"

import styles from "./AsyncButton.module.css"

export type Props = {
    onPress: () => Promise<unknown>,
    forceLoading?: boolean,
    disabled?: boolean,
    children: ReactNode,
}

export default function AsyncButton({ onPress, disabled, forceLoading, children }: Props) {
    const [isAwaitingPromise, setIsAwaitingPromise] = useState(false)
    const isLoading = isAwaitingPromise || forceLoading
    const [errorMessage, setErrorMessage] = useState("")
    const onClick = useCallback(() => {
        if (!disabled || isLoading) {
            setIsAwaitingPromise(true)
            setErrorMessage("")

            const promise = onPress()

            if (promise instanceof Promise) {
                promise.catch(error => {
                    console.error("AsyncButton caught error", error)
                    setErrorMessage(error.message || error.toString())
                }).finally(() => {
                    setIsAwaitingPromise(false)
                })
            } else {
                console.error("AsyncButton onPress() must return a promise, but instead it returned", promise)
                setIsAwaitingPromise(false)
            }
        }
    }, [disabled, isLoading, onPress])
    const { triggerProps, layerProps, arrowProps, renderLayer } = useLayer({
        isOpen: errorMessage !== "",
        onOutsideClick: () => setErrorMessage(""),
        placement: "top-center",
        triggerOffset: 8,
    })

    // TODO: prettier loading state

    return <button
        onClick={onClick}
        disabled={disabled}
        {...triggerProps}
    >
        {isLoading ? "Loading..." : children}

        {renderLayer(
            <AnimatePresence>
                {errorMessage && <motion.div
                    className={styles.errorPopup}
                    initial={{ scaleX: 0.7, scaleY: 0, opacity: 0 }}
                    animate={{ scaleX: 1, scaleY: 1, opacity: 1 }}
                    exit={{ scaleX: 0.7, scaleY: 0, opacity: 0 }}
                    transition={{ type: "spring", duration: 0.2 }}
                    {...layerProps}
                >
                    <span>{errorMessage}</span>
                    <Arrow size={12} backgroundColor="#bb4444" {...arrowProps} />
                </motion.div>}
            </AnimatePresence>
        )}
    </button>
}
