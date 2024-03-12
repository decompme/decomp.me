import { ExplanationArch, MnemonicInfo, splitByComma } from "./MnemonicUtils"

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

const MIPS_MNEMONICS: Record<string, MnemonicInfo> = {
    // Loading, storing
    "sw": {
        mnemonic: "sw",
        name: "Store Word",
        generic_explanation: "sw t1, t2 stores t1 into t2",
        explain_func: args => {
            return `Store ${args[0]} into ${args[1]}`
        },
    },
    "lw": {
        mnemonic: "lw",
        name: "Load Word",
        generic_explanation: "lw t1, t2 loads t2 into t1",
        explain_func: args => {
            return `Load ${args[1]} into ${args[0]}`
        },
    },
    "li": {
        mnemonic: "li",
        name: "Load Immediate",
        generic_explanation: "li t1, 42 loads 42 into t1",
        explain_func: args => {
            return `Load ${args[1]} into ${args[0]}`
        },
    },
    "lui": {
        mnemonic: "lui",
        name: "Load Upper Immediate",
        generic_explanation: "lui t1, 42 loads 42 into the upper 16 bits of t1",
        explain_func: args => {
            return `Load ${args[1]} into the upper 16 bits of ${args[0]}`
        },
    },
    "add": {
        mnemonic: "add",
        name: "Add",
        generic_explanation: "add t1, t2, t3 adds t2 and t3 and stores the result in t1",
        explain_func: args => {
            return `Add ${args[1]} and ${args[2]} and store the result in ${args[0]}`
        },
    },
    "addu": {
        mnemonic: "addu",
        name: "Add Unsigned",
        generic_explanation: "addu t1, t2, t3 adds t2 and t3 and stores the result in t1",
        explain_func: args => {
            return `Add ${args[1]} and ${args[2]} and store the result in ${args[0]}`
        },
    },
    "addiu": {
        mnemonic: "addiu",
        name: "Add Immediate Unsigned",
        generic_explanation: "addiu t1, t2, 42 adds 42 to t2 and stores the result in t1",
        explain_func: args => {
            const imm = parseInt(args[2])

            if (args[1] == args[0]) {
                const change = imm > 0 ? "Increment" : "Decrement"
                return `${change} ${args[1]} by ${args[2]}`
            }
            return `Add ${args[1]} and ${args[2]} and store the result in ${args[0]}`
        },
    },
    // Branches and jumps
    "b": {
        mnemonic: "b",
        name: "Branch",
        generic_explanation: "b label branches to label",
        explain_func: args => {
            return `Branch to ${args[0]}`
        },
    },
    "beq": {
        mnemonic: "beq",
        name: "Branch if Equal",
        generic_explanation: "beq t1, t2, label branches to label if t1 equals t2",
        explain_func: args => {
            return `Branch to ${args[2]} if ${args[0]} equals ${args[1]}`
        },
    },
    "beqz": {
        mnemonic: "beqz",
        name: "Branch if Zero",
        generic_explanation: "beqz t1, label branches to label if t1 is zero",
        explain_func: args => {
            return `Branch to ${args[1]} if ${args[0]} is zero`
        },
    },
    "beqzl": {
        mnemonic: "beqzl",
        name: "Branch if Zero Likely",
        generic_explanation: "beqzl t1, label branches to label if t1 is zero",
        explain_func: args => {
            return `Branch to ${args[1]} if ${args[0]} is zero. If ${args[0]} is not zero, the delay slot instruction is not executed`
        },
    },
    "j": {
        mnemonic: "j",
        name: "Jump",
        generic_explanation: "j label jumps to label",
        explain_func: args => {
            return `Jump to ${args[0]}`
        },
    },
    "jal": {
        mnemonic: "jal",
        name: "Jump and Link",
        generic_explanation: "jal label jumps to label and links",
        explain_func: args => {
            return `Jump to ${args[0]}`
        },
    },
    // Logical operations
    "and": {
        mnemonic: "and",
        name: "Bitwise AND",
        generic_explanation: "and t1, t2, t3 stores the result of (t2 & t3) in t1",
        explain_func: args => {
            return `Bitwise AND ${args[1]} and ${args[2]}, store the result in ${args[0]}`
        },
    },
    // "and": args => {
    //     return `Bitwise AND ${args[1]} and ${args[2]}, store the result in ${args[0]}`
    // },
}

export const MIPS_EXPLANATION_ARCH: ExplanationArch = {
    arch: "mips",
    splitArgs: splitByComma,
    formatArg: mipsFormatArg,
    mnemonics: MIPS_MNEMONICS,
}
