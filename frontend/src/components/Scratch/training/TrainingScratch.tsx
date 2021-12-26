import { useState } from "react"

import * as api from "../../../lib/api"
import { useSize } from "../../../lib/hooks"
import useScratchDocumentTitle from "../hooks/useScratchDocumentTitle"
import { LeftScratchTab, renderLeftTabs, renderRightTabs } from "../renderTabs"
import ScratchBody from "../ScratchBody"
import setCompilerOptsFunction from "../util/setCompilerOpts"
import tryClaimScratch from "../util/tryClaimScratch"

import useOnMatch from "./hooks/useOnMatch"
import styles from "./TrainingScratch.module.scss"
import TrainingScratchToolbar from "./TrainingScratchToolbar"

let isClaiming = false
const setIsClaiming = (value: boolean) => isClaiming = value

export type Props = {
    slug: string
    onMatch?: (slug: string) => void
    tryClaim?: boolean // note: causes page reload after claiming
}

export default function TrainingScratch({ slug, onMatch = () => {}, tryClaim }: Props) {
    const container = useSize<HTMLDivElement>()
    const { scratch, savedScratch, isSaved, setScratch, saveScratch } = api.useScratch(slug)
    const { compilation, isCompiling, compile } = api.useCompilation(scratch, savedScratch, true)
    const [leftTab, setLeftTab] = useState("source")
    const [rightTab, setRightTab] = useState("diff")

    // TODO: remove once scratch.compiler is no longer nullable
    const setCompilerOpts = setCompilerOptsFunction({ scratch, setScratch, saveScratch })

    useScratchDocumentTitle({ scratch, isSaved })
    useOnMatch({ compilation, onMatch })

    tryClaimScratch({ tryClaim, scratch, savedScratch, isClaiming, setIsClaiming })

    const leftTabs = renderLeftTabs({
        scratch,
        setScratch,
    }, [LeftScratchTab.SOURCE_CODE])

    const rightTabs = renderRightTabs({
        compilation,
    })

    return <div ref={container.ref} className={styles.container}>
        <TrainingScratchToolbar
            slug={slug}
            compile={compile}
            isCompiling={isCompiling}
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
