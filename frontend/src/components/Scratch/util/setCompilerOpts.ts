import { Scratch } from "../../../lib/api"
import { CompilerOptsT } from "../../compiler/CompilerOpts"

export type Props = {
    scratch: Scratch
    setScratch: (scratch: Partial<Scratch>) => void
}

// TODO: remove once scratch.compiler is no longer nullable
export default function setCompilerOptsFunction({ setScratch }: Props) {
    return ({ compiler, compiler_flags }: CompilerOptsT) => {
        setScratch({
            compiler,
            compiler_flags,
        })
    }
}
