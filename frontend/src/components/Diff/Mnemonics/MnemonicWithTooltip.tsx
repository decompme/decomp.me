import * as Tooltip from "@radix-ui/react-tooltip"

import { EXPLANATION_ARCHES, ExplanationArch, MnemonicInfo } from "./MnemonicUtils"
import styles from "./MnemonicWithTooltip.module.scss"

export function MnemonicTooltip({ arch, mnemonicInfo, args }: {
    arch: ExplanationArch
    mnemonicInfo: MnemonicInfo
    args: string[]
}) {
    const formattedArgs = args.map(arch.formatArg)

    return (
        <div>
            <h4 style={{ paddingBottom: "1em" }}>{mnemonicInfo.mnemonic} - {mnemonicInfo.name}</h4>
            {/* <p>General explanation: {mnemonicInfo.generic_explanation}</p> */}
            <p>{mnemonicInfo.explain_func(formattedArgs)}</p>
        </div>
    )
}

export function MnemonicWithTooltip({ mnemonic, line, arch }: {
    mnemonic: string
    line: string
    arch: string
}) {
    const restOfLine = line.slice(line.indexOf(mnemonic) + mnemonic.length)
    const explanationArch = EXPLANATION_ARCHES[arch]
    if (!explanationArch || !explanationArch.mnemonics[mnemonic]) {
        return mnemonic
    }
    const args = explanationArch.splitArgs(restOfLine)
    const mnemonicInfo = explanationArch.mnemonics[mnemonic]

    return (<Tooltip.Provider>
        <Tooltip.Root>
            <Tooltip.Trigger >
                {mnemonic}
            </Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content className={styles.TooltipContent} sideOffset={5}>
                    <MnemonicTooltip arch={explanationArch} mnemonicInfo={mnemonicInfo} args={args} />
                    <Tooltip.Arrow className={styles.TooltipArrow} />
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    </Tooltip.Provider >)
}
