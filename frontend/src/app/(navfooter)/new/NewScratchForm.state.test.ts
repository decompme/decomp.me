import { describe, expect, it } from "vitest";

import type * as api from "@/lib/api";
import type { TerseScratch } from "@/lib/api/types";

import {
    applyCompiler,
    applyPreset,
    clearSubmittedDraft,
    emptyDraft,
    filterDuplicateScratches,
    getLabels,
    readStoredDraft,
    selectDraftCompiler,
    storedDraftFields,
    writeStoredDraft,
    type NewScratchDraft,
    type StoredNewScratchDraft,
} from "./NewScratchForm.state";

function preset(overrides: Partial<api.Preset> = {}): api.Preset {
    return {
        id: 123,
        name: "Preset",
        platform: "n64",
        compiler: "ido5.3",
        compiler_flags: "-O2",
        diff_flags: ["-mreg-names=32"],
        libraries: [{ name: "libultra", version: "2.0I" }],
        assembler_flags: "",
        decompiler_flags: "",
        num_scratches: 0,
        owner: null,
        ...overrides,
    } as api.Preset;
}

function scratch(overrides: Partial<TerseScratch>): TerseScratch {
    return {
        slug: "scratch",
        owner: null,
        last_updated: "",
        creation_time: "",
        platform: "n64",
        compiler: "ido5.3",
        preset: null as number,
        name: "func",
        language: "C",
        score: -1,
        max_score: -1,
        match_override: false,
        parent: null,
        project: "",
        libraries: [],
        ...overrides,
    };
}

function storage(values: Record<string, string> = {}): Storage {
    const data = new Map(Object.entries(values));
    return {
        get length() {
            return data.size;
        },
        clear: () => data.clear(),
        key: (index: number) => [...data.keys()][index] ?? null,
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => {
            data.set(key, value);
        },
        removeItem: (key: string) => {
            data.delete(key);
        },
        value: (key: string) => data.get(key),
        has: (key: string) => data.has(key),
    };
}

describe("getLabels", () => {
    it("extracts supported assembly labels in order", () => {
        const asm = `
            glabel first_func
            .global second_func
thumb_func_start third_func
        `;

        expect(getLabels(asm)).toEqual([
            "first_func",
            "second_func",
            "third_func",
        ]);
    });

    it("filters jump table labels", () => {
        expect(
            getLabels(`
                glabel L80001234
                glabel jtbl_80000000
                glabel real_func
            `),
        ).toEqual(["real_func"]);
    });
});

describe("draft transitions", () => {
    it("applies preset compiler options", () => {
        const selectedPreset = preset();

        expect(applyPreset(emptyDraft, selectedPreset)).toMatchObject({
            presetId: selectedPreset.id,
            compilerId: selectedPreset.compiler,
            compilerFlags: selectedPreset.compiler_flags,
            diffFlags: selectedPreset.diff_flags,
            libraries: selectedPreset.libraries,
        });
    });

    it("clears preset-owned options when custom is selected", () => {
        const draft = applyPreset(emptyDraft, preset());

        expect(applyPreset(draft, null)).toMatchObject({
            presetId: undefined,
            compilerId: "ido5.3",
            compilerFlags: "",
            diffFlags: [],
            libraries: [],
        });
    });

    it("selects a custom compiler and clears preset-owned options", () => {
        const draft = applyPreset(emptyDraft, preset());

        expect(applyCompiler(draft, "gcc2.7.2")).toMatchObject({
            presetId: undefined,
            compilerId: "gcc2.7.2",
            compilerFlags: "",
            diffFlags: [],
            libraries: [],
        });
    });

    it("selects a valid stored preset before a stored compiler", () => {
        const draft: NewScratchDraft = {
            ...emptyDraft,
            presetId: 123,
            compilerId: "gcc2.7.2",
        };

        expect(
            selectDraftCompiler(draft, ["gcc2.7.2", "ido5.3"], [preset()]),
        ).toMatchObject({
            presetId: 123,
            compilerId: "ido5.3",
            compilerFlags: "-O2",
        });
    });

    it("falls back to the first compiler when stored choices are invalid", () => {
        const draft: NewScratchDraft = {
            ...emptyDraft,
            presetId: 999,
            compilerId: "missing",
        };

        expect(selectDraftCompiler(draft, ["ido5.3"], [])).toMatchObject({
            presetId: undefined,
            compilerId: "ido5.3",
            compilerFlags: "",
        });
    });
});

describe("duplicate filtering", () => {
    it("matches whole names and filters by preset when selected", () => {
        const scratches = [
            scratch({ name: "func", preset: 1, platform: "n64" }),
            scratch({ name: "func", preset: 2, platform: "n64" }),
            scratch({ name: "func_extra", preset: 1, platform: "n64" }),
        ];

        expect(filterDuplicateScratches(scratches, "func", "n64", 1)).toEqual([
            scratches[0],
        ]);
    });

    it("filters by platform when no preset is selected", () => {
        const scratches = [
            scratch({ name: "func", platform: "n64" }),
            scratch({ name: "func", platform: "ps1" }),
        ];

        expect(filterDuplicateScratches(scratches, "func", "ps1")).toEqual([
            scratches[1],
        ]);
    });
});

describe("draft storage", () => {
    it("reads stored values and ignores invalid platforms or preset IDs", () => {
        const stored = storage({
            new_scratch_label: "func",
            new_scratch_asm: "glabel func",
            new_scratch_context: "typedef int s32;",
            new_scratch_platform: "missing",
            new_scratch_compilerId: "ido5.3",
            new_scratch_presetId: "not-a-number",
        });

        expect(readStoredDraft(stored, ["n64"])).toEqual({
            label: "func",
            asm: "glabel func",
            context: "typedef int s32;",
            platform: "n64",
            compilerId: "ido5.3",
            presetId: undefined,
        });
    });

    it("writes stored fields and removes missing preset IDs", () => {
        const stored = storage({ new_scratch_presetId: "123" });
        const draft: StoredNewScratchDraft = {
            label: "func",
            asm: "glabel func",
            context: "",
            platform: "n64",
            compilerId: "ido5.3",
            presetId: undefined,
        };

        writeStoredDraft(stored, draft);

        expect(stored.value("new_scratch_label")).toBe("func");
        expect(stored.value("new_scratch_asm")).toBe("glabel func");
        expect(stored.value("new_scratch_platform")).toBe("n64");
        expect(stored.value("new_scratch_compilerId")).toBe("ido5.3");
        expect(stored.has("new_scratch_presetId")).toBe(false);
    });

    it("only stores draft fields that are safe to restore before catalogs load", () => {
        expect(
            storedDraftFields({
                ...emptyDraft,
                label: "func",
                compilerFlags: "-O2",
                diffFlags: ["-mreg-names=32"],
                libraries: [{ name: "libultra", version: "2.0I" }],
            }),
        ).toEqual({
            label: "func",
            asm: "",
            context: "",
            platform: undefined,
            compilerId: "",
            presetId: undefined,
        });
    });

    it("clears submitted text fields", () => {
        const stored = storage({
            new_scratch_label: "func",
            new_scratch_asm: "glabel func",
        });

        clearSubmittedDraft(stored);

        expect(stored.value("new_scratch_label")).toBe("");
        expect(stored.value("new_scratch_asm")).toBe("");
    });
});
