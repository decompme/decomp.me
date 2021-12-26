import { useEffect } from "react"

import { Scratch } from "../../../lib/api"

export type Props = {
    isSaved: boolean
    scratch: Scratch
    saveScratch: () => Promise<void>
}

export default function useSaveShortcut({ isSaved, scratch, saveScratch }: Props) {
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
