import { MIPS_EXPLANATION_ARCH } from "./Mips"

export function splitByComma(line: string) {
    return line.split(",").map(arg => arg.trim())
}

export type ExplanationArch = {
    arch: string
    splitArgs: ((line: string) => string[])
    formatArg: ((arg: string) => string)
    mnemonics: Record<string, MnemonicInfo>
}

export type MnemonicInfo = {
    mnemonic: string
    name: string
    generic_explanation: string
    explain_func: ((args: string[]) => string)
}

export const EXPLANATION_ARCHES: Record<string, ExplanationArch> = {
    "mips": MIPS_EXPLANATION_ARCH,
    "mipsel": MIPS_EXPLANATION_ARCH,
    "mipsee": MIPS_EXPLANATION_ARCH,
    "mipsel:4000": MIPS_EXPLANATION_ARCH,
}
