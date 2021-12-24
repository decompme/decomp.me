import { useState } from "react"

import * as api from "../../lib/api"
import { useSize } from "../../lib/hooks"

import useSaveShortcut from "./hooks/useSaveShortcut"
import useScratchDocumentTitle from "./hooks/useScratchDocumentTitle"
import useWarnBeforeScratchUnload from "./hooks/useWarnBeforeScratchUnload"
import { renderLeftTabs, renderRightTabs } from "./renderTabs"
import styles from "./Scratch.module.scss"
import ScratchBody from "./ScratchBody"
import ScratchToolbar from "./ScratchToolbar"
import setCompilerOptsFunction from "./util/setCompilerOpts"
import tryClaimScratch from "./util/tryClaimScratch"

let isClaiming = false
const setIsClaiming = (value: boolean) => isClaiming = value

export type Props = {
    slug: string
    tryClaim?: boolean // note: causes page reload after claiming
}

export default function Scratch({ slug, tryClaim }: Props) {
    const container = useSize<HTMLDivElement>()
    const { scratch, savedScratch, isSaved, setScratch, saveScratch } = api.useScratch(slug)
    const { compilation, isCompiling, compile } = api.useCompilation(scratch, savedScratch, true)
    const forkScratch = api.useForkScratchAndGo(savedScratch, scratch)
    const [leftTab, setLeftTab] = useState("source")
    const [rightTab, setRightTab] = useState("diff")
    const [isForking, setIsForking] = useState(false)

    // TODO: remove once scratch.compiler is no longer nullable
    const setCompilerOpts = setCompilerOptsFunction({ scratch, setScratch, saveScratch })

    useSaveShortcut({ isSaved, scratch, saveScratch })
    useScratchDocumentTitle({ scratch, isSaved })
    useWarnBeforeScratchUnload({ isSaved, isForking, scratch })

    tryClaimScratch({ tryClaim, scratch, savedScratch, isClaiming, setIsClaiming })

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
            forkScratch={forkScratch}
            isCompiling={isCompiling}
            isSaved={isSaved}
            saveScratch={saveScratch}
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
