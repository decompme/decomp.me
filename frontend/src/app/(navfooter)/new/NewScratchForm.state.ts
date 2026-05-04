import type * as api from "@/lib/api";
import type { TerseScratch } from "@/lib/api/types";

export type NewScratchDraft = {
    label: string;
    asm: string;
    context: string;
    platform?: string;
    compilerId: string;
    compilerFlags: string;
    diffFlags: string[];
    libraries: api.Library[];
    presetId?: number;
};

export type StoredNewScratchDraft = Pick<
    NewScratchDraft,
    "label" | "asm" | "context" | "platform" | "compilerId" | "presetId"
>;

export const emptyDraft: NewScratchDraft = {
    label: "",
    asm: "",
    context: "",
    platform: undefined,
    compilerId: "",
    compilerFlags: "",
    diffFlags: [],
    libraries: [],
    presetId: undefined,
};

const jumpTableLabelRegex = /(^L[0-9a-fA-F]{8}$)|(^jtbl_)/;

export function getLabels(asm: string): string[] {
    const labels: string[] = [];

    for (const line of asm.split("\n")) {
        let match = line.match(/^\s*glabel\s+([A-z0-9_]+)\s*/);
        if (match) {
            labels.push(match[1]);
            continue;
        }

        match = line.match(/^\s*\.global\s+([A-z0-9_]+)\s*/);
        if (match) {
            labels.push(match[1]);
            continue;
        }

        match = line.match(/^[A-z_]+_func_start\s+([A-z0-9_]+)/);
        if (match) {
            labels.push(match[1]);
        }
    }

    return labels.filter((label) => !jumpTableLabelRegex.test(label));
}

export function applyPreset(
    draft: NewScratchDraft,
    preset: api.Preset | null | undefined,
): NewScratchDraft {
    if (!preset) {
        return {
            ...draft,
            presetId: undefined,
            compilerFlags: "",
            diffFlags: [],
            libraries: [],
        };
    }

    return {
        ...draft,
        presetId: preset.id,
        compilerId: preset.compiler,
        compilerFlags: preset.compiler_flags,
        diffFlags: preset.diff_flags,
        libraries: preset.libraries,
    };
}

export function applyCompiler(
    draft: NewScratchDraft,
    compilerId?: string,
): NewScratchDraft {
    return {
        ...draft,
        compilerId: compilerId ?? "",
        compilerFlags: "",
        diffFlags: [],
        libraries: [],
        presetId: undefined,
    };
}

export function selectDraftCompiler(
    draft: NewScratchDraft,
    availableCompilers: string[],
    availablePresets: api.Preset[],
): NewScratchDraft {
    const preset = availablePresets.find(
        (preset) => preset.id === draft.presetId,
    );
    if (preset) {
        return applyPreset(draft, preset);
    }

    if (availableCompilers.includes(draft.compilerId)) {
        return applyCompiler(draft, draft.compilerId);
    }

    return applyCompiler(draft, availableCompilers[0]);
}

export function storedDraftFields(
    draft: NewScratchDraft,
): StoredNewScratchDraft {
    return {
        label: draft.label,
        asm: draft.asm,
        context: draft.context,
        platform: draft.platform,
        compilerId: draft.compilerId,
        presetId: draft.presetId,
    };
}

export function filterDuplicateScratches(
    scratches: TerseScratch[],
    label: string,
    platform?: string,
    presetId?: number,
): TerseScratch[] {
    return scratches.filter((scratch) => {
        if (scratch.name !== label) {
            return false;
        }

        if (typeof presetId !== "undefined") {
            return scratch.preset === presetId;
        }

        return scratch.platform === platform;
    });
}

export function readStoredDraft(
    storage: Storage,
    platformIds: string[],
): StoredNewScratchDraft {
    const storedPlatform = storage.getItem("new_scratch_platform");
    const platform = platformIds.includes(storedPlatform)
        ? storedPlatform
        : platformIds[0];
    const storedPresetId = Number.parseInt(
        storage.getItem("new_scratch_presetId"),
    );

    return {
        label: storage.getItem("new_scratch_label") ?? "",
        asm: storage.getItem("new_scratch_asm") ?? "",
        context: storage.getItem("new_scratch_context") ?? "",
        platform,
        compilerId: storage.getItem("new_scratch_compilerId") ?? "",
        presetId: Number.isNaN(storedPresetId) ? undefined : storedPresetId,
    };
}

export function writeStoredDraft(
    storage: Storage,
    draft: StoredNewScratchDraft,
) {
    storage.setItem("new_scratch_label", draft.label);
    storage.setItem("new_scratch_asm", draft.asm);
    storage.setItem("new_scratch_context", draft.context);
    storage.setItem("new_scratch_platform", draft.platform ?? "");
    storage.setItem("new_scratch_compilerId", draft.compilerId);

    if (draft.presetId === undefined) {
        storage.removeItem("new_scratch_presetId");
    } else {
        storage.setItem("new_scratch_presetId", String(draft.presetId));
    }
}

export function clearSubmittedDraft(storage: Storage) {
    storage.setItem("new_scratch_label", "");
    storage.setItem("new_scratch_asm", "");
}
