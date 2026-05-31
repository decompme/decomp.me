import { describe, expect, it } from "vitest";

import { parseCompilerMessages } from "./compilerMessages";

describe("parseCompilerMessages", () => {
    it("captures src file line references", () => {
        expect(
            parseCompilerMessages(
                "src.c:49: warning: incompatible pointer type",
            ),
        ).toEqual([
            { type: "sourceLine", text: "src.c:49", line: 49 },
            { type: "text", text: ": warning: incompatible pointer type" },
        ]);
    });

    it("captures cfe src file line references", () => {
        expect(
            parseCompilerMessages(
                "cfe: Warning 745: src.c, line 1: storage size for 'some_array' isn't known",
            ),
        ).toEqual([
            { type: "text", text: "cfe: Warning 745: " },
            { type: "sourceLine", text: "src.c, line 1", line: 1 },
            {
                type: "text",
                text: ": storage size for 'some_array' isn't known",
            },
        ]);
    });

    it("captures quoted src file line references", () => {
        expect(
            parseCompilerMessages(
                '"src.c", line 3: Error:  #70: incomplete type is not allowed',
            ),
        ).toEqual([
            { type: "sourceLine", text: '"src.c", line 3', line: 3 },
            {
                type: "text",
                text: ": Error:  #70: incomplete type is not allowed",
            },
        ]);
    });

    it("captures parenthesized src file line references", () => {
        expect(
            parseCompilerMessages(
                "src.c(16) : 1000 (W) Illegal pointer assignment",
            ),
        ).toEqual([
            { type: "sourceLine", text: "src.c(16)", line: 16 },
            { type: "text", text: " : 1000 (W) Illegal pointer assignment" },
        ]);
    });

    it("preserves text around the source line reference", () => {
        expect(parseCompilerMessages("note: src.cpp:7: error")).toEqual([
            { type: "text", text: "note: " },
            { type: "sourceLine", text: "src.cpp:7", line: 7 },
            { type: "text", text: ": error" },
        ]);
    });

    it("ignores context file line references", () => {
        expect(parseCompilerMessages("ctx.c:12: error")).toEqual([
            { type: "text", text: "ctx.c:12: error" },
        ]);
    });

    it("does not capture embedded src-looking strings", () => {
        expect(parseCompilerMessages("tmp/src.c:12: error")).toEqual([
            { type: "text", text: "tmp/src.c:12: error" },
        ]);
    });
});
