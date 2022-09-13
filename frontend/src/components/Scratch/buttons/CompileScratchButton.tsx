import { SyncIcon } from "@primer/octicons-react"

import AsyncButton from "../../AsyncButton"

export default function CompileScratchButton({ compile, isCompiling, title }) {
    return (
        <AsyncButton onClick={compile} forceLoading={isCompiling} title={title}>
            <SyncIcon size={16} /> Compile
        </AsyncButton>
    )
}
