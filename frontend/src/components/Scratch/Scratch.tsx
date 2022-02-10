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
import setCompilerOptsFunction from "./util/setCompilerOpts"

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
    const { compilation, isCompiling, compile } = api.useCompilation(scratch, autoRecompileSetting, autoRecompileDelaySetting, initialCompilation)

    const [leftTab, setLeftTab] = useState("source")
    const [rightTab, setRightTab] = useState("diff")

    const setCompilerOpts = setCompilerOptsFunction({ scratch, setScratch })

    const leftTabs = useLeftTabs({
        scratch,
        setScratch,
    })

    const rightTabs = useRightTabs({
        compilation,
        isCompiling,
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
            scratch={scratch}
            setCompilerOpts={setCompilerOpts}
        />
    </div>
}
