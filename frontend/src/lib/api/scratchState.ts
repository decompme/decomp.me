import type { Scratch } from "./types";

const SCRATCH_SAVE_FIELDS = [
    "source_code",
    "context",
    "compiler",
    "compiler_flags",
    "diff_flags",
    "diff_label",
    "preset",
    "name",
    "description",
    "match_override",
    "libraries",
] as const;

type ScratchSaveField = (typeof SCRATCH_SAVE_FIELDS)[number];

export type ScratchSavePatch = Partial<Pick<Scratch, ScratchSaveField>>;

export type ScratchCompileRequest = Pick<
    Scratch,
    | "compiler"
    | "compiler_flags"
    | "diff_flags"
    | "diff_label"
    | "libraries"
    | "source_code"
> & {
    context: Scratch["context"] | null | undefined;
    include_objects: true;
};

function normalizeLineEndings(value: string) {
    return value.replace(/\r\n?/g, "\n");
}

function areScratchFieldValuesEqual<K extends ScratchSaveField>(
    saved: Scratch,
    local: Scratch,
    key: K,
) {
    const savedValue = saved[key];
    const localValue = local[key];

    if (key === "diff_flags" || key === "libraries") {
        return JSON.stringify(savedValue) === JSON.stringify(localValue);
    }

    if (key === "source_code" || key === "context") {
        return (
            normalizeLineEndings(savedValue as string) ===
            normalizeLineEndings(localValue as string)
        );
    }

    return savedValue === localValue;
}

export function undefinedIfUnchanged<O, K extends keyof O>(
    saved: O,
    local: O,
    key: K,
): O[K] | undefined {
    if (saved[key] !== local[key]) {
        return local[key] !== undefined ? local[key] : null;
    }
}

export function buildScratchSavePatch(
    saved: Scratch,
    local: Scratch,
): ScratchSavePatch {
    const patch: ScratchSavePatch = {};
    const patchFields = patch as Record<string, unknown>;

    for (const field of SCRATCH_SAVE_FIELDS) {
        if (!areScratchFieldValuesEqual(saved, local, field)) {
            patchFields[field] =
                local[field] !== undefined ? local[field] : null;
        }
    }

    return patch;
}

export function isScratchSaved(local: Scratch, saved: Scratch) {
    return SCRATCH_SAVE_FIELDS.every((field) =>
        areScratchFieldValuesEqual(saved, local, field),
    );
}

export function buildScratchCompileRequest(
    saved: Scratch | null | undefined,
    local: Scratch,
): ScratchCompileRequest {
    return {
        compiler: local.compiler,
        compiler_flags: local.compiler_flags,
        diff_flags: local.diff_flags,
        diff_label: local.diff_label,
        libraries: local.libraries,
        source_code: local.source_code,
        context:
            saved && areScratchFieldValuesEqual(saved, local, "context")
                ? undefined
                : local.context,
        include_objects: true,
    };
}
