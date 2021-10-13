import { useState, useRef, useLayoutEffect, useEffect, RefObject } from "react"

import Router from "next/router"

import useResizeObserver from "@react-hook/resize-observer"

export function useSize<T extends HTMLElement>(): {
    width: number | undefined,
    height: number | undefined,
    ref: RefObject<T>,
    } {
    const ref = useRef<T>()
    const [size, setSize] = useState({ width: undefined, height: undefined })

    useLayoutEffect(() => {
        if (ref.current)
            setSize(ref.current.getBoundingClientRect())
    }, [ref])

    useResizeObserver(ref, entry => setSize(entry.contentRect))

    return { width: size.width, height: size.height, ref }
}

export function useWarnBeforeUnload(enabled: boolean, message: string = "Are you sure you want to leave this page?") {
    const enabledRef = useRef(enabled)
    const messageRef = useRef(message)

    enabledRef.current = enabled
    messageRef.current = message

    // Based on code from https://github.com/vercel/next.js/issues/2476#issuecomment-563190607
    useEffect(() => {
        const routeChangeStart = (url: string) => {
            if (Router.asPath !== url && enabledRef.current && !confirm(messageRef.current)) {
                Router.events.emit("routeChangeError")
                Router.replace(Router, Router.asPath)

                // This error shows onscreen in dev but we can't do anything about it
                throw new Error("abort route change - ignore this error")
            }
        }

        const onUnload = (event: BeforeUnloadEvent) => {
            if (enabledRef.current) {
                event.preventDefault()
                return event.returnValue = messageRef.current
            }
        }

        window.addEventListener("beforeunload", onUnload, { capture: true })
        Router.events.on("routeChangeStart", routeChangeStart)

        return () => {
            window.removeEventListener("beforeunload", onUnload, { capture: true })
            Router.events.off("routeChangeStart", routeChangeStart)
        }
    }, [enabledRef, messageRef])
}

export function useThemeVariable(variable: string): string {
    const [value, setValue] = useState<string>()

    useEffect(() => {
        const style = window.getComputedStyle(document.body)
        setValue(style.getPropertyValue(variable))
    }, [variable])

    return value
}
