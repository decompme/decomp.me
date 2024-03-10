import * as Tooltip from "@radix-ui/react-tooltip"

import styles from "./MnemonicWithTooltip.module.scss"

function splitByComma(line: string) {
    return line.split(",").map(arg => arg.trim())
}

function mipsFormatArg(arg: string) {
    //  %hi(symbol)
    const m = arg.match(/%hi\(([^)]+)\)/)
    if (m) {
        return "high bits of " + m[1]
    }
    // if the argument is a hex number, show it in decimal as well
    if (arg.match(/^-?0x[0-9a-fA-F]+$/)) {
        const dec = parseInt(arg, 16)
        if (Math.abs(dec) < 10) {
            return dec.toString()
        } else {
            return arg + " (" + dec.toString() + ")"
        }
    }
    return arg
}

export type ExplanationArch = {
    arch: string
    splitArgs: ((line: string) => string[])
    formatArg: ((arg: string) => string)
    mnemonicFuncs: Record<string, ((args: string[]) => string)>
}

const MIPS_FUNCS: Record<string, ((args: string[]) => string)> = {
    "sw": (args) => {
        return `Store ${args[1]} into ${args[0]}`
    },
    "lw": (args) => {
        return `Load ${args[1]} into ${args[0]}`
    },
    "li": (args) => {
        return `Load ${args[1]} into ${args[0]}`
    },
    "lui": (args) => {
        return `Load upper immediate: Load ${args[1]} into ${args[0]}`
    },
    "b": (args) => {
        return `Branch to ${args[0]}`
    },
    "beq": (args) => {
        return `Branch to ${args[2]} if ${args[0]} equals ${args[1]}`
    },
    "beqz": (args) => {
        return `Branch to ${args[1]} if ${args[0]} is zero`
    },
    "beqzl": (args) => {
        return `Branch to ${args[1]} if ${args[0]} is zero. If ${args[0]} is not zero, the delay slot instruction is not executed`
    },
    "jal": (args) => {
        return `Jump to ${args[0]} and link`
    },
    "and": (args) => {
        return `Bitwise AND ${args[1]} and ${args[2]}, store the result in ${args[0]}`
    }
};

const MIPS_EXPLANATION_ARCH: ExplanationArch = {
    arch: "mips",
    splitArgs: splitByComma,
    formatArg: mipsFormatArg,
    mnemonicFuncs: MIPS_FUNCS,
}

const EXPLANATION_ARCHES: Record<string, ExplanationArch> = {
    "mips": MIPS_EXPLANATION_ARCH,
    "mipsel": MIPS_EXPLANATION_ARCH,
    "mipsee": MIPS_EXPLANATION_ARCH,
    "mipsel:4000": MIPS_EXPLANATION_ARCH,
}

export function MnemonicWithTooltip({ mnemonic, line, arch }: {
    mnemonic: string
    line: string
    arch: string
}) {
    const restOfLine = line.slice(line.indexOf(mnemonic) + mnemonic.length)
    const explanationArch = EXPLANATION_ARCHES[arch]
    if (!explanationArch || !explanationArch.mnemonicFuncs[mnemonic]) {
        return mnemonic
    }
    const args = explanationArch.splitArgs(restOfLine)
    const formattedArgs = args.map(explanationArch.formatArg)
    const explanationFunc = explanationArch.mnemonicFuncs[mnemonic]

    return (<Tooltip.Provider>
        <Tooltip.Root>
            <Tooltip.Trigger >
                {mnemonic}
            </Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content className={styles.TooltipContent} sideOffset={5}>
                    {explanationFunc(formattedArgs)}
                    <Tooltip.Arrow className={styles.TooltipArrow} />
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    </Tooltip.Provider >)
}
