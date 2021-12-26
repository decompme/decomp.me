import useDeepCompareEffect from "use-deep-compare-effect"

import { Scratch } from "../../../lib/api"

export type Props = {
    scratch: Scratch
    isSaved: boolean
}

export default function useScratchDocumentTitle({ scratch, isSaved }: Props) {
    useDeepCompareEffect(() => {
        if (scratch) {
            document.title = scratch.name || "Untitled scratch"

            if (!isSaved) {
                document.title += " (unsaved changes)"
            }

            document.title += " | decomp.me"
        }
    }, [scratch || {}, isSaved])
}
