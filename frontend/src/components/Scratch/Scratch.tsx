import { useState } from "react"

import * as api from "../../lib/api"
import { useSize } from "../../lib/hooks"
import { useAutoRecompileSetting } from "../../lib/settings"

import { useLeftTabs, useRightTabs } from "./renderTabs"
import styles from "./Scratch.module.scss"
import ScratchBody from "./ScratchBody"
import ScratchToolbar from "./ScratchToolbar"
import setCompilerOptsFunction from "./util/setCompilerOpts"

export type Props = {
    scratch: Readonly<api.Scratch>
    onChange: (scratch: Partial<api.Scratch>) => void
}

export default function Scratch({
    scratch,
    onChange: setScratch,
}: Props) {
    const container = useSize<HTMLDivElement>()

    const [autoRecompileSetting] = useAutoRecompileSetting()
    const { compilation, isCompiling, compile } = api.useCompilation(scratch, autoRecompileSetting)

    const [leftTab, setLeftTab] = useState("source")
    const [rightTab, setRightTab] = useState("diff")

    const saveScratch = api.useSaveScratch(scratch)
    const setCompilerOpts = setCompilerOptsFunction({ scratch, setScratch, saveScratch })

    const leftTabs = useLeftTabs({
        scratch,
        setScratch,
    })

    const rightTabs = useRightTabs({
        compilation,
    })

    return <div ref={container.ref} className={styles.container}>
        <ScratchToolbar
            compile={compile}
            isCompiling={isCompiling}
            scratch={scratch}
            setScratch={setScratch}
        />
        <ScratchBody
            container={container}
            leftTab={leftTab}
            rightTab={rightTab}
            setLeftTab={setLeftTab}
            setRightTab={setRightTab}
            leftTabs={leftTabs}
            rightTabs={rightTabs}
            scratch={scratch}
            setCompilerOpts={setCompilerOpts}
        />
    </div>
}
