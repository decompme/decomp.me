import { UploadIcon } from "@primer/octicons-react"

import * as api from "../../../lib/api"
import AsyncButton from "../../AsyncButton"

export default function SaveScratchButton({ scratch, compile }) {
    const saveScratch = api.useSaveScratch(scratch)
    const isSaved = api.useIsScratchSaved(scratch)

    return (
        <AsyncButton
            onClick={() => {
                return Promise.all([
                    saveScratch(),
                    compile().catch(() => {}), // Ignore errors
                ])
            }}
            disabled={isSaved}
        >
            <UploadIcon size={16} /> Save
        </AsyncButton>
    )
}
