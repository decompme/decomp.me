import { useEffect } from "react"

import * as api from "../../../lib/api"

export default function useSaveShortcut(scratch: api.Scratch) {
    const isSaved = api.useIsScratchSaved(scratch)

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key == "s") {
                event.preventDefault()

                if (!isSaved && scratch.owner?.is_you) {
                    saveScratch()
                }
            }
        }

        document.addEventListener("keydown", handler)
        return () => document.removeEventListener("keydown", handler)
    })
}
