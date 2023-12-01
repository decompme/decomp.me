import { useState } from "react"

import useSWR, { SWRResponse } from "swr"

import { get, patch } from "./api"
import { useWarnBeforeUnload } from "./hooks"

export interface Actions<T> {
    /** Direct access to SWR response */
    swr: SWRResponse<T>

    /** True if local data has been modified and not yet submitted. */
    isModified: boolean

    /** Negation of isModified. */
    isSaved: boolean

    /** Commit local data to the server. */
    save: () => Promise<void>

    /** Modify local data without submitting. */
    assign: (partial: Partial<T>) => void

    /** Resets local data to the server state. */
    reset: () => void
}

export interface HasUrl {
    url: string
}

export default function useEntity<T>(entityUrl: string): [T, Actions<T>] {
    const url = entityUrl
    const swr = useSWR(url, get, { suspense: true })
    const [localPatch, setLocalPatch] = useState<Partial<T> | null>(null)
    const isModified = localPatch !== null
    const data = isModified ? { ...swr.data, ...localPatch } : swr.data

    useWarnBeforeUnload(isModified)

    return [data, {
        swr,
        isModified,
        isSaved: !isModified,
        async save() {
            if (!isModified) {
                console.warn("Ignoring entity save() without changes")
                return
            }

            setLocalPatch(null)
            await swr.mutate(() => patch(url, localPatch), {
                optimisticData: data,
                rollbackOnError: true,
            })
        },
        assign(partial: Partial<T>) {
            if (localPatch) {
                setLocalPatch({ ...localPatch, ...partial })
            } else {
                setLocalPatch(partial)
            }
        },
        reset() {
            setLocalPatch(null)
        },
    }]
}
