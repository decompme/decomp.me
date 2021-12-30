import { UploadIcon } from "@primer/octicons-react"
import { dequal } from "dequal"

import * as api from "../../../lib/api"
import AsyncButton from "../../AsyncButton"

export default function SaveScratchButton({ scratch, compile }) {
    const saveScratch = api.useSaveScratch(scratch)
    const savedScratch = api.useSavedScratch(scratch)
    const isSaved = dequal(scratch, savedScratch)

    return scratch.owner?.is_you && (
        <AsyncButton onClick={() => {
            return Promise.all([
                saveScratch(),
                compile().catch(() => {}), // Ignore errors
            ])
        }} disabled={isSaved}>
            <UploadIcon size={16} /> Save
        </AsyncButton>
    )
}
