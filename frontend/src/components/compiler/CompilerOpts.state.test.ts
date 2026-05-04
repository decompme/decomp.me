import { describe, expect, it } from "vitest";

import {
    addLibrary,
    applyDiffFlagEdits,
    getDiffFlagValue,
    getLibraryVersionOptions,
    hasCompilerFlag,
    removeLibrary,
    setCompilerFlag,
    setLibraryVersion,
} from "./CompilerOpts.state";

describe("compiler flag editing", () => {
    it("checks complete flags only", () => {
        expect(hasCompilerFlag("-O2 -mips2", "-O2")).toBe(true);
        expect(hasCompilerFlag("-O20 -mips2", "-O2")).toBe(false);
    });

    it("adds and removes compiler flags", () => {
        expect(setCompilerFlag("-O2", "-g", true)).toBe("-O2 -g");
        expect(setCompilerFlag("-O2 -g", "-g", false)).toBe("-O2");
    });

    it("normalizes whitespace and avoids duplicates", () => {
        expect(setCompilerFlag("  -O2   -g  ", "-O2", true)).toBe("-g -O2");
    });

    it("applies multiple edits in order", () => {
        let flags = "-O2 -g";

        for (const edit of [
            { flag: "-O2", value: false },
            { flag: "-mips2", value: true },
        ]) {
            flags = setCompilerFlag(flags, edit.flag, edit.value);
        }

        expect(flags).toBe("-g -mips2");
    });

    it("does not add empty compiler flags", () => {
        expect(setCompilerFlag("-O2", "", true)).toBe("-O2");
    });
});

describe("diff flag editing", () => {
    it("adds enabled diff flags", () => {
        expect(
            applyDiffFlagEdits(
                ["-DIFFreloc"],
                [{ flag: "-DIFFdifflib", value: true }],
            ),
        ).toEqual(["-DIFFreloc", "-DIFFdifflib"]);
    });

    it("removes exact disabled diff flags", () => {
        expect(
            applyDiffFlagEdits(
                ["-DIFFreloc", "-DIFFdiff_label=func", "-DIFFdifflib"],
                [{ flag: "-DIFFreloc", value: false }],
            ),
        ).toEqual(["-DIFFdiff_label=func", "-DIFFdifflib"]);
    });

    it("removes parameter values by base flag", () => {
        expect(
            applyDiffFlagEdits(
                ["-DIFFreloc", "-DIFFdiff_label=old_func"],
                [
                    { flag: "-DIFFdiff_label", value: false },
                    { flag: "-DIFFdiff_label=new_func", value: true },
                ],
            ),
        ).toEqual(["-DIFFreloc", "-DIFFdiff_label=new_func"]);
    });

    it("preserves the same array when parameter edits do not change flags", () => {
        const flags = ["-DIFFreloc", "-DIFFdiff_label=target_func"];

        expect(
            applyDiffFlagEdits(flags, [
                { flag: "-DIFFdiff_label", value: false },
                { flag: "-DIFFdiff_label=target_func", value: true },
            ]),
        ).toBe(flags);
    });

    it("does not add empty diff flags", () => {
        expect(
            applyDiffFlagEdits(
                ["-Mreg-names=32"],
                [
                    { flag: "-Mreg-names=32", value: false },
                    { flag: "", value: true },
                ],
            ),
        ).toEqual([]);
    });

    it("preserves flags that only share a prefix", () => {
        expect(
            applyDiffFlagEdits(
                ["-foo", "-foobar"],
                [{ flag: "-foo", value: false }],
            ),
        ).toEqual(["-foobar"]);
    });

    it("reads parameter flag values", () => {
        expect(
            getDiffFlagValue(
                ["-DIFFreloc", "-DIFFdiff_label=target_func"],
                "-DIFFdiff_label=",
            ),
        ).toBe("target_func");
    });
});

describe("library editing", () => {
    const availableLibraries = [
        { name: "libultra", supported_versions: ["2.0I", "2.0J"] },
        { name: "directx", supported_versions: ["7.0"] },
    ];

    it("uses supported versions for known libraries", () => {
        expect(
            getLibraryVersionOptions(availableLibraries, {
                name: "libultra",
                version: "2.0I",
            }),
        ).toEqual({ "2.0I": "2.0I", "2.0J": "2.0J" });
    });

    it("keeps the current version available for unknown libraries", () => {
        expect(
            getLibraryVersionOptions(availableLibraries, {
                name: "custom",
                version: "abc",
            }),
        ).toEqual({ abc: "abc" });
    });

    it("adds a library with its first supported version", () => {
        expect(addLibrary([], availableLibraries, "libultra")).toEqual([
            { name: "libultra", version: "2.0I" },
        ]);
    });

    it("ignores unknown libraries", () => {
        const libraries = [{ name: "libultra", version: "2.0I" }];

        expect(addLibrary(libraries, availableLibraries, "__NULL__")).toBe(
            libraries,
        );
    });

    it("updates an existing library version", () => {
        expect(
            setLibraryVersion(
                [{ name: "libultra", version: "2.0I" }],
                "libultra",
                "2.0J",
            ),
        ).toEqual([{ name: "libultra", version: "2.0J" }]);
    });

    it("preserves the same array when a library version is unchanged", () => {
        const libraries = [{ name: "libultra", version: "2.0I" }];

        expect(setLibraryVersion(libraries, "libultra", "2.0I")).toBe(
            libraries,
        );
    });

    it("adds a missing library when setting its version", () => {
        expect(setLibraryVersion([], "libultra", "2.0J")).toEqual([
            { name: "libultra", version: "2.0J" },
        ]);
    });

    it("removes libraries by name", () => {
        expect(
            removeLibrary(
                [
                    { name: "libultra", version: "2.0I" },
                    { name: "directx", version: "7.0" },
                ],
                "libultra",
            ),
        ).toEqual([{ name: "directx", version: "7.0" }]);
    });

    it("preserves the same array when removing a missing library", () => {
        const libraries = [{ name: "libultra", version: "2.0I" }];

        expect(removeLibrary(libraries, "missing")).toBe(libraries);
    });
});
