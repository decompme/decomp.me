import { Dispatch, SetStateAction } from "react"

import { RepoForkedIcon } from "@primer/octicons-react"

import { Scratch, useSaveScratch } from "../../lib/api"
import AsyncButton from "../AsyncButton"

import CompileScratchButton from "./buttons/CompileScratchButton"
import SaveScratchButton from "./buttons/SaveScratchButton"
import styles from "./ScratchToolbar.module.scss"

export type Props = {
    isCompiling: boolean
    compile: () => Promise<void>
    onFork?: () => Promise<void>
    setIsForking: Dispatch<SetStateAction<boolean>>
    scratch: Readonly<Scratch>
    setScratch: (scratch: Partial<Scratch>) => void
    isSaved: boolean
}

export default function ScratchToolbar({
    isCompiling, compile, scratch, setScratch, isSaved,
}: Props) {
    const forkScratch = async () => {} // TODO

    return (
        <div className={styles.toolbar}>
            <input
                className={styles.scratchName}
                type="text"
                value={scratch.name}
                onChange={event => setScratch({ name: event.target.value })}
                disabled={!scratch.owner?.is_you}
                spellCheck="false"
                maxLength={100}
                placeholder={"Untitled scratch"}
            />
            <CompileScratchButton compile={compile} isCompiling={isCompiling} />
            <SaveScratchButton compile={compile} scratch={scratch} />
            <AsyncButton onClick={forkScratch} primary={!isSaved && !scratch.owner?.is_you}>
                <RepoForkedIcon size={16} /> Fork
            </AsyncButton>
        </div>
    )
}
