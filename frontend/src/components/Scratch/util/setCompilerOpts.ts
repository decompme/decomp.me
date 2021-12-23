import { Scratch } from "../../../lib/api"
import { CompilerOptsT } from "../../compiler/CompilerOpts"

export type Props = {
    scratch: Scratch
    setScratch: (scratch: Partial<Scratch>) => void
    saveScratch: () => Promise<void>
}

// TODO: remove once scratch.compiler is no longer nullable
export default function setCompilerOptsFunction({ scratch, setScratch, saveScratch }: Props) {
    return ({ compiler, compiler_flags }: CompilerOptsT) => {
        setScratch({
            compiler,
            compiler_flags,
        })
        if (scratch.owner?.is_you)
            saveScratch()
    }
}
