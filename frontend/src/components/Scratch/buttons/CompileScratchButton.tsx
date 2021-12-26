import { SyncIcon } from "@primer/octicons-react"

import AsyncButton from "../../AsyncButton"

export default function CompileScratchButton({ compile, isCompiling }) {
    return (
        <AsyncButton onClick={compile} forceLoading={isCompiling}>
            <SyncIcon size={16} /> Compile
        </AsyncButton>
    )
}
