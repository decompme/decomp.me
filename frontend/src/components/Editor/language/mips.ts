import type { languages } from "monaco-editor"

export const conf: languages.LanguageConfiguration = {
    comments: {
        lineComment: "#",
        blockComment: ["/*", "*/"]
    },
    brackets: [
        ["(", ")"],
    ],
    autoClosingPairs: [
        { open: "(", close: ")" },
        { open: "\"", close: "\"", notIn: ["string"] }
    ],
    surroundingPairs: [
        { open: "(", close: ")" },
        { open: "\"", close: "\"" },
    ],
}

export const language: languages.IMonarchLanguage = {
    defaultToken: "",
    tokenPostfix: ".mips",

    brackets: [
        { token: "delimiter.parenthesis", open: "(", close: ")" },
    ],

    keywords: [
        "glabel",
    ],

    instructions: [
        "lb", "lbu", "ld", "ldl", "ldr", "lh", "lhu", "ll", "lld", "lw", "lwl", "lwr", "lwu", "sb", "sc", "scd", "sd", "sdl", "sdr", "sh", "sw", "swl", "swr", "sync", "add", "addi", "addiu", "addu", "and", "andi", "dadd", "daddi", "daddiu", "daddu", "ddiv", "ddivu", "div", "divu", "dmult", "dmultu", "dsll", "dsll32", "dsllv", "dsra", "dsra32", "dsrav", "dsrl", "dsrl32", "dsrlv", "dsub", "dsubu", "lui", "mfhi", "mflo", "mthi", "mtlo", "mult", "multu", "nor", "or", "ori", "sll", "sllv", "slt", "slti", "sltiu", "sltu", "sra", "srav", "srl", "srlv", "sub", "subu", "xor", "xori", "beq", "beql", "bgez", "bgezal", "bgezall", "bgezl", "bgtz", "bgtzl", "blez", "blezl", "bltz", "bltzal", "bltzall", "bltzl", "bne", "bnel", "j", "jal", "jalr", "jr", "break", "syscall", "teq", "teqi", "tge", "tgei", "tgeiu", "tgeu", "tlt", "tlti", "tltiu", "tltu", "tne", "tnei", "cache", "dmfc0", "dmtc0", "eret", "mfc0", "mtc0", "tlbp", "tlbr", "tlbwi", "tlbwr", "bc1f", "bc1fl", "bc1t", "bc1tl", "cfc1", "ctc1", "dmfc1", "dmtc1", "ldc1", "lwc1", "mfc1", "mtc1", "sdc1", "swc1",
        "beqz", "bnez", "negu", "nop",
    ],

    registers: [
        "$zero", "$t0", "$s0", "$t8", "$at", "$t1", "$s1", "$t9", "$v0", "$t2", "$s2", "$k0", "$v1", "$t3", "$s3", "$k1", "$a0", "$t4", "$s4", "$gp", "$a1", "$t5", "$s5", "$sp", "$a2", "$t6", "$s6", "$s8", "$a3", "$t7", "$s7", "$ra",
    ],

    // we include these common regular expressions
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    integersuffix: /(ll|LL|u|U|l|L)?(ll|LL|u|U|l|L)?/,
    encoding: /u|u8|U|L/,

    // The main tokenizer for our languages
    tokenizer: {
        root: [
            // whitespace
            { include: "@whitespace" },

            // identifiers and keywords
            [
                /[a-zA-Z_]\w*/,
                {
                    cases: {
                        "jal": { token: "function" },
                        "@instructions": { token: "support.function.$0" },
                        "@keywords": { token: "keyword.$0" },
                        "@default": "identifier"
                    }
                }
            ],
            [
                /\$\w+/,
                {
                    cases: {
                        "@registers": { token: "entity.name.register.$0" },
                        "@default": "identifier"
                    }
                }
            ],
            [/%(hi|lo)/, "macro"],
            [/\.\w+/, { token: "keyword.directive" }],

            // delimiters and operators
            [/[()]/, "@brackets"],

            // numbers
            [/\d*\d+[eE]([-+]?\d+)?/, "number.float"],
            [/\d*\.\d+([eE][-+]?\d+)?/, "number.float"],
            [/0[xX][0-9a-fA-F']*[0-9a-fA-F](@integersuffix)/, "number.hex"],
            [/0[0-7']*[0-7](@integersuffix)/, "number.octal"],
            [/0[bB][0-1']*[0-1](@integersuffix)/, "number.binary"],
            [/\d[\d']*\d(@integersuffix)/, "number"],
            [/\d(@integersuffix)/, "number"],

            // delimiter: after number because of .\d floats
            [/[;,.]/, "delimiter"],

            // strings
            [/"([^"\\]|\\.)*$/, "string.invalid"], // non-teminated string
            [/"/, "string", "@string"],

            // characters
            [/'[^\\']'/, "string"],
            [/(')(@escapes)(')/, ["string", "string.escape", "string"]],
            [/'/, "string.invalid"]
        ],

        whitespace: [
            [/[ \t\r\n]+/, ""],
            [/\/\*/, "comment", "@comment"],
            [/#.*\\$/, "comment", "@linecomment"],
            [/#.*$/, "comment"]
        ],

        comment: [
            [/[^/*]+/, "comment"],
            [/\*\//, "comment", "@pop"],
            [/[/*]/, "comment"]
        ],

        //For use with continuous line comments
        linecomment: [
            [/.*[^#]$/, "comment", "@pop"],
            [/[^]+/, "comment"]
        ],

        string: [
            [/[^\\"]+/, "string"],
            [/@escapes/, "string.escape"],
            [/\\./, "string.escape.invalid"],
            [/"/, "string", "@pop"]
        ],

        raw: [
            [
                /(.*)(\))(?:([^ ()\\\t"]*))(")/,
                {
                    cases: {
                        "$3==$S2": [
                            "string.raw",
                            "string.raw.end",
                            "string.raw.end",
                            { token: "string.raw.end", next: "@pop" }
                        ],
                        "@default": ["string.raw", "string.raw", "string.raw", "string.raw"]
                    }
                }
            ],
            [/.*/, "string.raw"]
        ],

        include: [
            [
                /(\s*)(<)([^<>]*)(>)/,
                [
                    "",
                    "keyword.directive.include.begin",
                    "string.include.identifier",
                    { token: "keyword.directive.include.end", next: "@pop" }
                ] as languages.IMonarchLanguageAction
            ],
            [
                /(\s*)(")([^"]*)(")/,
                [
                    "",
                    "keyword.directive.include.begin",
                    "string.include.identifier",
                    { token: "keyword.directive.include.end", next: "@pop" }
                ] as languages.IMonarchLanguageAction
            ]
        ]
    }
}
