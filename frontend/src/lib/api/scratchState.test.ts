import { describe, expect, it } from "vitest";

import type { Scratch } from "./types";
import {
    buildScratchCompileRequest,
    buildScratchSavePatch,
    isScratchSaved,
    undefinedIfUnchanged,
} from "./scratchState";

const scratch = (overrides: Partial<Scratch> = {}): Scratch => ({
    slug: "abc123",
    owner: null,
    parent: null,
    name: "Scratch",
    creation_time: "2026-01-01T00:00:00Z",
    last_updated: "2026-01-01T00:00:00Z",
    compiler: "ido5.3",
    preset: 123,
    platform: "n64",
    language: "C",
    score: 0,
    max_score: 100,
    match_override: false,
    project: "",
    libraries: [{ name: "libultra", version: "2.0I" }],
    best_fork: null,
    description: "notes",
    compiler_flags: "-O2",
    diff_flags: ["-DIFFreloc"],
    source_code: "int main(void) { return 0; }",
    context: "typedef int s32;",
    diff_label: "func",
    ...overrides,
});

describe("scratch save state", () => {
    it("treats identical scratch save fields as saved", () => {
        expect(isScratchSaved(scratch(), scratch())).toBe(true);
    });

    it("ignores fields that are not saved from the editor", () => {
        expect(
            isScratchSaved(
                scratch({
                    score: 100,
                    max_score: 100,
                    last_updated: "2026-02-01T00:00:00Z",
                }),
                scratch(),
            ),
        ).toBe(true);
    });

    it("detects scalar field changes", () => {
        expect(isScratchSaved(scratch({ name: "Changed" }), scratch())).toBe(
            false,
        );
    });

    it("ignores source and context line ending differences", () => {
        expect(
            isScratchSaved(
                scratch({
                    source_code: "int main(void) {\n    return 0;\n}",
                    context: "typedef int s32;\ntypedef float f32;",
                }),
                scratch({
                    source_code: "int main(void) {\r\n    return 0;\r\n}",
                    context: "typedef int s32;\r\ntypedef float f32;",
                }),
            ),
        ).toBe(true);
    });

    it("compares diff flags and libraries by value", () => {
        expect(
            isScratchSaved(
                scratch({
                    diff_flags: ["-DIFFreloc"],
                    libraries: [{ name: "libultra", version: "2.0I" }],
                }),
                scratch({
                    diff_flags: ["-DIFFreloc"],
                    libraries: [{ name: "libultra", version: "2.0I" }],
                }),
            ),
        ).toBe(true);
    });

    it("builds a patch with only changed save fields", () => {
        expect(
            buildScratchSavePatch(
                scratch(),
                scratch({
                    name: "Changed",
                    compiler_flags: "-O2 -g",
                    score: 100,
                }),
            ),
        ).toEqual({
            name: "Changed",
            compiler_flags: "-O2 -g",
        });
    });

    it("does not patch equal array fields with different references", () => {
        expect(
            buildScratchSavePatch(
                scratch(),
                scratch({
                    diff_flags: ["-DIFFreloc"],
                    libraries: [{ name: "libultra", version: "2.0I" }],
                }),
            ),
        ).toEqual({});
    });

    it("does not patch source and context line ending differences", () => {
        expect(
            buildScratchSavePatch(
                scratch({
                    source_code: "int main(void) {\r\n    return 0;\r\n}",
                    context: "typedef int s32;\r\ntypedef float f32;",
                }),
                scratch({
                    source_code: "int main(void) {\n    return 0;\n}",
                    context: "typedef int s32;\ntypedef float f32;",
                }),
            ),
        ).toEqual({});
    });

    it("patches changed array fields", () => {
        expect(
            buildScratchSavePatch(
                scratch(),
                scratch({
                    diff_flags: ["-DIFFreloc", "-DIFFdifflib"],
                    libraries: [{ name: "libultra", version: "2.0J" }],
                }),
            ),
        ).toEqual({
            diff_flags: ["-DIFFreloc", "-DIFFdifflib"],
            libraries: [{ name: "libultra", version: "2.0J" }],
        });
    });
});

describe("undefinedIfUnchanged", () => {
    it("returns undefined for unchanged values", () => {
        expect(
            undefinedIfUnchanged({ value: "a" }, { value: "a" }, "value"),
        ).toBeUndefined();
    });

    it("returns changed values", () => {
        expect(
            undefinedIfUnchanged({ value: "a" }, { value: "b" }, "value"),
        ).toBe("b");
    });
});

describe("scratch compile request", () => {
    it("includes compiler inputs and object output request", () => {
        expect(buildScratchCompileRequest(null, scratch())).toEqual({
            compiler: "ido5.3",
            compiler_flags: "-O2",
            diff_flags: ["-DIFFreloc"],
            diff_label: "func",
            libraries: [{ name: "libultra", version: "2.0I" }],
            source_code: "int main(void) { return 0; }",
            context: "typedef int s32;",
            include_objects: true,
        });
    });

    it("omits unchanged context when a saved scratch is available", () => {
        expect(buildScratchCompileRequest(scratch(), scratch())).toMatchObject({
            context: undefined,
        });
    });

    it("omits context when only line endings changed", () => {
        expect(
            buildScratchCompileRequest(
                scratch({ context: "typedef int s32;\r\ntypedef float f32;" }),
                scratch({ context: "typedef int s32;\ntypedef float f32;" }),
            ),
        ).toMatchObject({
            context: undefined,
        });
    });

    it("includes changed context when a saved scratch is available", () => {
        expect(
            buildScratchCompileRequest(
                scratch({ context: "typedef int s32;" }),
                scratch({ context: "typedef unsigned int u32;" }),
            ),
        ).toMatchObject({
            context: "typedef unsigned int u32;",
        });
    });
});
