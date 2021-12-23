import { Dispatch, SetStateAction } from "react"

import { RepoForkedIcon } from "@primer/octicons-react"

import { Scratch } from "../../lib/api"
import AsyncButton from "../AsyncButton"

import CompileScratchButton from "./buttons/CompileScratchButton"
import SaveScratchButton from "./buttons/SaveScratchButton"
import styles from "./Scratch.module.scss"

export type Props = {
    isCompiling: boolean
    compile: () => Promise<void>
    forkScratch: () => Promise<void>
    setIsForking: Dispatch<SetStateAction<boolean>>
    scratch: Readonly<Scratch>
    setScratch: (scratch: Partial<Scratch>) => void
    saveScratch: () => Promise<void>
    isSaved: boolean
}

export default function ScratchToolbar({
    isCompiling, compile, forkScratch, setIsForking, scratch, setScratch, saveScratch, isSaved,
}: Props) {
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
            <SaveScratchButton compile={compile} isSaved={isSaved} saveScratch={saveScratch} scratch={scratch} />
            <AsyncButton onClick={() => {
                setIsForking(true)
                return forkScratch()
            }} primary={!isSaved && !scratch.owner?.is_you}>
                <RepoForkedIcon size={16} /> Fork
            </AsyncButton>
        </div>
    )
}
