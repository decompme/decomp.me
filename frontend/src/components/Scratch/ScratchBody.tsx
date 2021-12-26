import { Dispatch, JSXElementConstructor, ReactElement, RefObject, SetStateAction } from "react"

import * as resizer from "react-simple-resizer"

import { Scratch } from "../../lib/api"
import { CompilerOptsT } from "../compiler/CompilerOpts"
import Tabs, { Tab } from "../Tabs"

import ChooseACompiler from "./ChooseACompiler"
import styles from "./ScratchBody.module.scss"

const LEFT_PANE_MIN_WIDTH = 400
const RIGHT_PANE_MIN_WIDTH = 400

export type Props = {
    container: {width: number | undefined, height: number | undefined, ref: RefObject<HTMLDivElement>}
    leftTab: string
    rightTab: string
    setLeftTab: Dispatch<SetStateAction<string>>
    setRightTab: Dispatch<SetStateAction<string>>
    leftTabs: ReactElement<typeof Tab, string | JSXElementConstructor<unknown>>[]
    rightTabs: ReactElement<typeof Tab, string | JSXElementConstructor<unknown>>[]
    setCompilerOpts: ({ compiler, compiler_flags }: CompilerOptsT) => void
    scratch: Scratch
}

export default function ScratchBody({
    container,
    leftTab,
    rightTab,
    setLeftTab,
    setRightTab,
    leftTabs,
    rightTabs,
    setCompilerOpts,
    scratch,
}: Props) {
    return container.width > (LEFT_PANE_MIN_WIDTH + RIGHT_PANE_MIN_WIDTH)
        ? (<resizer.Container className={styles.resizer}>
            <resizer.Section minSize={LEFT_PANE_MIN_WIDTH}>
                <resizer.Container vertical style={{ height: "100%" }}>
                    <Tabs activeTab={leftTab} onChange={setLeftTab}>
                        {leftTabs}
                    </Tabs>
                </resizer.Container>
            </resizer.Section>

            <resizer.Bar
                size={1}
                style={{
                    cursor: "col-resize",
                    background: "var(--a100)",
                }}
                expandInteractiveArea={{ left: 4, right: 4 }}
            />

            <resizer.Section className={styles.diffSection} minSize={RIGHT_PANE_MIN_WIDTH}>
                {scratch.compiler === ""
                    ? <ChooseACompiler platform={scratch.platform} onCommit={setCompilerOpts} />
                    : <Tabs activeTab={rightTab} onChange={setRightTab}>
                        {rightTabs}
                    </Tabs>
                }
            </resizer.Section>
        </resizer.Container>)
        : scratch.compiler === ""
            ? (<ChooseACompiler platform={scratch.platform} onCommit={setCompilerOpts} />)
            : (<Tabs activeTab={leftTab} onChange={setLeftTab}>
                {leftTabs}
                {rightTabs}
            </Tabs>)
}
