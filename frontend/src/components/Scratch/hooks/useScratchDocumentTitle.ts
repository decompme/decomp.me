import * as api from "../../../lib/api"

export default function useScratchDocumentTitle(scratch: api.Scratch): string {
    const isSaved = api.useIsScratchSaved(scratch)

    let title = scratch?.name || "Untitled scratch"

    if (!isSaved) {
        title += " (unsaved changes)"
    }

    title += " | decomp.me"

    if (typeof document !== "undefined") {
        document.title = title
    }

    return title
}
