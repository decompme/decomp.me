import { RepoForkedIcon } from "@primer/octicons-react"

import * as api from "../../lib/api"
import AsyncButton from "../AsyncButton"

import CompileScratchButton from "./buttons/CompileScratchButton"
import SaveScratchButton from "./buttons/SaveScratchButton"
import styles from "./ScratchToolbar.module.scss"

export type Props = {
    isCompiling: boolean
    compile: () => Promise<void>
    scratch: Readonly<api.Scratch>
    setScratch: (scratch: Partial<api.Scratch>) => void
}

export default function ScratchToolbar({
    isCompiling, compile, scratch, setScratch,
}: Props) {
    const forkScratch = async () => {} // TODO
    const userIsYou = api.useUserIsYou()
    const isSaved = api.useIsScratchSaved(scratch)
    const isSSR = typeof window === "undefined"

    if (isSSR) {
        return <div className={styles.toolbar} />
    }

    return (
        <div className={styles.toolbar}>
            <input
                className={styles.scratchName}
                type="text"
                value={scratch.name}
                onChange={event => setScratch({ name: event.target.value })}
                disabled={!userIsYou(scratch.owner)}
                spellCheck="false"
                maxLength={100}
                placeholder={"Untitled scratch"}
            />
            <CompileScratchButton compile={compile} isCompiling={isCompiling} />
            {userIsYou(scratch.owner) && <SaveScratchButton compile={compile} scratch={scratch} />}
            <AsyncButton onClick={forkScratch} primary={!isSaved && !userIsYou(scratch.owner)}>
                <RepoForkedIcon size={16} /> Fork
            </AsyncButton>
        </div>
    )
}
