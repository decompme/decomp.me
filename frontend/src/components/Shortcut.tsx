"use client"

import { useEffect, useState } from "react"

import { isMacOS as deviceIsMacOS } from "@/lib/device"

function useIsMacOS() {
    const [isMacOS, setIsMacOS] = useState(false)
    useEffect(() => setIsMacOS(deviceIsMacOS()), [])
    return isMacOS
}

export type Key = string | SpecialKey

export type ShortcutCallback = (event: KeyboardEvent | MouseEvent) => void | Promise<unknown>

// In sort order (besides Shift on MacOS)
export enum SpecialKey {
    ALT_OPTION = 0,
    CTRL_COMMAND = 1,
    SHIFT = 2,
}

export class KeyMap extends Map<Key, boolean> {
    private normalizeKey(key: Key) {
        if (typeof key === "string") {
            return key.toLowerCase()
        } else {
            return key
        }
    }

    get(key: Key): boolean {
        return !!super.get(this.normalizeKey(key))
    }

    set(key: Key, value: boolean): this {
        return super.set(this.normalizeKey(key), value)
    }
}

export function useTranslateKey(key: Key): string {
    const isMacOS = useIsMacOS()

    switch (key) {
    case SpecialKey.CTRL_COMMAND:
        return isMacOS ? "⌘" : "Ctrl"
    case SpecialKey.ALT_OPTION:
        return isMacOS ? "⌥" : "Alt"
    case SpecialKey.SHIFT:
        return isMacOS ? "⇧" : "Shift"
    default:
        return key.toLocaleUpperCase()
    }
}

export function useGetSeparator(): string {
    const THIN_SPACE = " "

    return useIsMacOS() ? THIN_SPACE : "+"
}

export function useTranslateKeys(keys: Key[]): string {
    const isMacOS = useIsMacOS()
    const separator = useGetSeparator()

    if (!keys || keys.length === 0) {
        return ""
    }

    return keys
        .sort((a, b) => {
            if (isMacOS && (a === SpecialKey.SHIFT || b === SpecialKey.SHIFT)) {
                return a === SpecialKey.SHIFT ? -1 : 1 // Shift comes first on MacOS
            } else if (typeof a === "string" && typeof b === "string") {
                return a.localeCompare(b) // Sort alphabetically
            } else if (typeof a === "number" && typeof b !== "number") {
                return -1 // Regular keys after special keys
            } else if (typeof a !== "number" && typeof b === "number") {
                return 1 // Special keys before regular keys
            } else {
                return a < b ? -1 : 1 // Sort in order of the enum
            }
        })
        .map(useTranslateKey)
        .join(separator)
}

export function useShortcut(keys: Key[], callback: ShortcutCallback, element?: HTMLElement): string | undefined {
    const isMacOS = useIsMacOS()

    useEffect(() => {
        const el = element || document.body
        const keysDown = new KeyMap()

        if (!el || !keys || !callback) {
            return
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented) {
                return
            }

            const { key, metaKey, ctrlKey, altKey, shiftKey } = event

            keysDown.set(key, true)

            for (const key of keys) {
                if (keysDown.get(key))
                    continue

                switch (key) {
                case SpecialKey.CTRL_COMMAND:
                    if (isMacOS ? metaKey : ctrlKey)
                        continue
                    break
                case SpecialKey.ALT_OPTION:
                    if (altKey)
                        continue
                    break
                case SpecialKey.SHIFT:
                    if (shiftKey)
                        continue
                    break
                }

                return
            }

            event.preventDefault()
            event.stopImmediatePropagation()

            keysDown.clear()
            callback(event)
        }

        const handleKeyUp = (event: KeyboardEvent) => {
            const { key } = event

            keysDown.set(key, false)
        }

        const handleBlur = () => {
            keysDown.clear()
        }

        //console.log("Shortcut " + translateKeys(keys) + " mounting")
        el.addEventListener("keydown", handleKeyDown)
        el.addEventListener("keyup", handleKeyUp)
        el.addEventListener("blur", handleBlur)

        return () => {
            //console.log("Shortcut " + translateKeys(keys) + " unmounting")
            el.removeEventListener("keydown", handleKeyDown)
            el.removeEventListener("keyup", handleKeyUp)
            el.removeEventListener("blur", handleBlur)
        }
    }, [callback, element, isMacOS, keys])

    const keysString = useTranslateKeys(keys)

    if (!keys || keys.length === 0) {
        return undefined
    } else {
        return keysString
    }
}

export default function Shortcut({ keys, className }: { keys: Key[], className?: string }) {
    const [mounted, setMounted] = useState(false)
    const keysString = useTranslateKeys(keys)

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    return <span className={className}>
        {mounted && keysString}
    </span>
}
