import { useEffect } from "react"

import * as api from "../../../lib/api"

export default function useSaveShortcut(scratch: api.Scratch) {
    const saveScratch = api.useSaveScratch(scratch)
    const forkScratch = api.useForkScratchAndGo(scratch)
    const userIsYou = api.useUserIsYou()

    useEffect(() => {
        const handler = async (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key == "s") {
                event.preventDefault()

                if (!scratch.owner) {
                    await api.claimScratch(scratch)
                    await saveScratch()
                } else if (userIsYou(scratch.owner)) {
                    await saveScratch()
                } else {
                    await forkScratch()
                }
            }
        }

        document.addEventListener("keydown", handler)
        return () => document.removeEventListener("keydown", handler)
    })
}
