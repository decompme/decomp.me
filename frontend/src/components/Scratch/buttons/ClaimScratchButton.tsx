import { PersonAddIcon } from "@primer/octicons-react"

import * as api from "../../../lib/api"
import AsyncButton from "../../AsyncButton"

export default function ClaimScratchButton({ scratch }: { scratch: api.Scratch }) {
    const isSaved = api.useIsScratchSaved(scratch)

    return (
        <AsyncButton
            onClick={async () => {
                await api.claimScratch(scratch)
            }}
            primary={!isSaved}
            disabled={!!scratch.owner}
        >
            <PersonAddIcon size={16} /> Claim
        </AsyncButton>
    )
}
