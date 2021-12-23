import { useState } from "react"

import { ArrowRightIcon } from "@primer/octicons-react"

import Button from "../Button"
import CompilerOpts, { CompilerOptsT } from "../compiler/CompilerOpts"

import styles from "./Scratch.module.scss"

export default function ChooseACompiler({ platform, onCommit }: {
    platform: string
    onCommit: (opts: CompilerOptsT) => void
}) {
    const [compiler, setCompiler] = useState<CompilerOptsT>()

    return <div className={styles.chooseACompiler}>
        <CompilerOpts
            title="Choose a compiler"
            platform={platform}
            value={compiler}
            onChange={c => setCompiler(c)}
        />

        <div className={styles.chooseACompilerActions}>
            <Button primary onClick={() => onCommit(compiler)}>
                Use this compiler
                <ArrowRightIcon size={16} />
            </Button>
        </div>
    </div>
}
