import { useState } from "react"

import * as api from "../../lib/api"
import { useSize } from "../../lib/hooks"

import { renderLeftTabs, renderRightTabs } from "./renderTabs"
import styles from "./Scratch.module.scss"
import ScratchBody from "./ScratchBody"
import ScratchToolbar from "./ScratchToolbar"
import setCompilerOptsFunction from "./util/setCompilerOpts"

export type Props = {
    scratch: api.Scratch
    isSaved: boolean
    onChange: (scratch: Partial<api.Scratch>) => void
}

export default function Scratch({
    scratch,
    isSaved,
    onChange: setScratch,
}: Props) {
    const container = useSize<HTMLDivElement>()

    //const { scratch, savedScratch, isSaved, setScratch, saveScratch } = api.useScratch(slug)
    const { compilation, isCompiling, compile } = api.useCompilation(scratch, true)
    //const forkScratch = api.useForkScratchAndGo(savedScratch, scratch)
    const [leftTab, setLeftTab] = useState("source")
    const [rightTab, setRightTab] = useState("diff")
    const [isForking, setIsForking] = useState(false)

    const saveScratch = api.useSaveScratch(scratch)
    const setCompilerOpts = setCompilerOptsFunction({ scratch, setScratch, saveScratch })

    const leftTabs = renderLeftTabs({
        scratch,
        setScratch,
    })

    const rightTabs = renderRightTabs({
        compilation,
    })

    return <div ref={container.ref} className={styles.container}>
        <ScratchToolbar
            compile={compile}
            isCompiling={isCompiling}
            isSaved={isSaved}
            scratch={scratch}
            setIsForking={setIsForking}
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
