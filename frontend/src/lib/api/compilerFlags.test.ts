import { describe, expect, it } from "vitest";
import {
    resolveCompilerLanguage,
    resolveCompilersResponse,
    resolveFlags,
} from "./compilerFlags";
import type { CompilersResponse, Flag } from "./types";

const parentFlag: Flag = {
    type: "checkbox",
    id: "parent",
    flag: "-parent",
};
const childFlag: Flag = {
    type: "checkbox",
    id: "child",
    flag: "-child",
};
const diffParentFlag: Flag = {
    type: "checkbox",
    id: "diff-parent",
    flag: "-diff-parent",
};
const diffChildFlag: Flag = {
    type: "checkbox",
    id: "diff-child",
    flag: "-diff-child",
};

describe("resolveFlags", () => {
    it("resolves inherited flags parent-first", () => {
        expect(
            resolveFlags("child", {
                parent: { flags: [parentFlag] },
                child: { parent: "parent", flags: [childFlag] },
            }),
        ).toEqual([parentFlag, childFlag]);
    });

    it("rejects missing parent classes", () => {
        expect(() =>
            resolveFlags("child", {
                child: { parent: "missing", flags: [childFlag] },
            }),
        ).toThrow("Unknown flag class: missing");
    });

    it("rejects inheritance cycles", () => {
        expect(() =>
            resolveFlags("left", {
                left: { parent: "right", flags: [] },
                right: { parent: "left", flags: [] },
            }),
        ).toThrow("Cyclic flag class inheritance");
    });
});

describe("resolveCompilersResponse", () => {
    it("adds resolved flags to compiler metadata", () => {
        const response: CompilersResponse = {
            compilers: {
                test: {
                    id: "test",
                    platform: "n64",
                    flags_class: "child",
                    diff_flags_class: "diff-child",
                    language: {
                        default: {
                            id: "c",
                            display_name: "C",
                            extension: "c",
                        },
                        overrides: [
                            {
                                flag: "-lang=c++",
                                id: "cxx",
                                display_name: "C++",
                                extension: "cpp",
                            },
                            {
                                flag: "-lang=c",
                                id: "c",
                                display_name: "C",
                                extension: "c",
                            },
                        ],
                    },
                },
            },
            flags: {
                parent: { flags: [parentFlag] },
                child: { parent: "parent", flags: [childFlag] },
            },
            diff_flags: {
                "diff-parent": { flags: [diffParentFlag] },
                "diff-child": {
                    parent: "diff-parent",
                    flags: [diffChildFlag],
                },
            },
        };

        const compiler = resolveCompilersResponse(response).test;
        expect(compiler.flags).toEqual([parentFlag, childFlag]);
        expect(compiler.diff_flags).toEqual([diffParentFlag, diffChildFlag]);
        expect(response.compilers.test).not.toHaveProperty("flags");
        expect(response.compilers.test).not.toHaveProperty("diff_flags");
    });

    it("resolves language metadata from exact compiler flags", () => {
        const compiler = {
            id: "test",
            platform: "n64",
            flags_class: "test",
            diff_flags_class: "test",
            flags: [] as Flag[],
            diff_flags: [] as Flag[],
            language: {
                default: {
                    id: "c",
                    display_name: "C",
                    extension: "c",
                },
                overrides: [
                    {
                        flag: "-lang=c++",
                        id: "cxx",
                        display_name: "C++",
                        extension: "cpp",
                    },
                    {
                        flag: "-lang=c",
                        id: "c",
                        display_name: "C",
                        extension: "c",
                    },
                ],
            },
        };

        expect(resolveCompilerLanguage(compiler, "-O2 -lang=c++")?.id).toBe(
            "cxx",
        );
        expect(resolveCompilerLanguage(compiler, "-O2 -lang=c")?.id).toBe("c");
        expect(resolveCompilerLanguage(compiler, "-O2")?.id).toBe("c");
    });
});
