import { UploadIcon } from "@primer/octicons-react"

import * as api from "../../../lib/api"
import AsyncButton from "../../AsyncButton"

export default function SaveScratchButton({ scratch, setScratch, isSaving, compile }) {
    const saveScratch = api.useSaveScratch(scratch)
    const isSaved = api.useIsScratchSaved(scratch)

    return (
        <AsyncButton
            onClick={() => {
                return Promise.all([
                    saveScratch().then(setScratch),
                    compile().catch(() => {}), // Ignore errors
                ])
            }}
            disabled={isSaved}
            forceLoading={isSaving}
        >
            <UploadIcon size={16} /> Save
        </AsyncButton>
    )
}
