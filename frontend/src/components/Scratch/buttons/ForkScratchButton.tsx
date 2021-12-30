import { RepoForkedIcon } from "@primer/octicons-react"

import * as api from "../../../lib/api"
import AsyncButton from "../../AsyncButton"

export default function ForkScratchButton({ scratch }: { scratch: api.Scratch }) {
    const forkScratch = api.useForkScratchAndGo(scratch)
    const userIsYou = api.useUserIsYou()
    const isSaved = api.useIsScratchSaved(scratch)

    return (
        <AsyncButton onClick={forkScratch} primary={!isSaved && scratch.owner && !userIsYou(scratch.owner)}>
            <RepoForkedIcon size={16} /> Fork
        </AsyncButton>
    )
}
