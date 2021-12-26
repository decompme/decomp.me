import { UploadIcon } from "@primer/octicons-react"

import AsyncButton from "../../AsyncButton"

export default function SaveScratchButton({ scratch, saveScratch, compile, isSaved }) {
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
