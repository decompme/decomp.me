import { useState } from "react"

import * as api from "../../lib/api"
import { useSize } from "../../lib/hooks"
import { useAutoRecompileSetting, useAutoRecompileDelaySetting } from "../../lib/settings"
import ErrorBoundary from "../ErrorBoundary"

import { useLeftTabs, useRightTabs } from "./renderTabs"
import styles from "./Scratch.module.scss"
import ScratchBody from "./ScratchBody"
import ScratchMatchBanner from "./ScratchMatchBanner"
import ScratchToolbar from "./ScratchToolbar"

export type Props = {
    scratch: Readonly<api.Scratch>
    onChange: (scratch: Partial<api.Scratch>) => void
    initialCompilation?: Readonly<api.Compilation>
}

export default function Scratch({
    scratch,
    onChange: setScratch,
    initialCompilation,
}: Props) {
    const container = useSize<HTMLDivElement>()

    const [autoRecompileSetting] = useAutoRecompileSetting()
    const [autoRecompileDelaySetting] = useAutoRecompileDelaySetting()
    const { compilation, isCompiling, isCompilationOld, compile } = api.useCompilation(scratch, autoRecompileSetting, autoRecompileDelaySetting, initialCompilation)

    const [leftTab, setLeftTab] = useState("source")
    const [rightTab, setRightTab] = useState("diff")
    const [selectedSourceLine, setSelectedSourceLine] = useState<number | null>()

    const leftTabs = useLeftTabs({
        scratch,
        setScratch,
        setSelectedSourceLine,
    })

    const rightTabs = useRightTabs({
        compilation,
        isCompiling,
        isCompilationOld,
        selectedSourceLine,
    })

    return <div ref={container.ref} className={styles.container}>
        <ErrorBoundary>
            <ScratchMatchBanner scratch={scratch} />
        </ErrorBoundary>
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
        />
    </div>
}
