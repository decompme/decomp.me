import { describe, expect, it } from "vitest";

import type { CompilersResponse, Flag } from "./types";
import {
    resolveCompilerFlags,
    resolveCompilersResponse,
} from "./compilerFlags";

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

describe("resolveCompilerFlags", () => {
    it("resolves inherited flags parent-first", () => {
        expect(
            resolveCompilerFlags("child", {
                parent: { flags: [parentFlag] },
                child: { parent: "parent", flags: [childFlag] },
            }),
        ).toEqual([parentFlag, childFlag]);
    });

    it("rejects missing parent classes", () => {
        expect(() =>
            resolveCompilerFlags("child", {
                child: { parent: "missing", flags: [childFlag] },
            }),
        ).toThrow("Unknown compiler flag class: missing");
    });

    it("rejects inheritance cycles", () => {
        expect(() =>
            resolveCompilerFlags("left", {
                left: { parent: "right", flags: [] },
                right: { parent: "left", flags: [] },
            }),
        ).toThrow("Cyclic compiler flag class inheritance");
    });
});

describe("resolveCompilersResponse", () => {
    it("adds resolved flags to compiler metadata", () => {
        const response: CompilersResponse = {
            compilers: {
                test: {
                    id: "test",
                    platform: "n64",
                    class: "child",
                    diff_flags: [],
                    language: ["C", "c"],
                },
            },
            flags: {
                parent: { flags: [parentFlag] },
                child: { parent: "parent", flags: [childFlag] },
            },
        };

        expect(resolveCompilersResponse(response).test.flags).toEqual([
            parentFlag,
            childFlag,
        ]);
        expect(response.compilers.test).not.toHaveProperty("flags");
    });
});
