"use client";

import { useMemo, useState } from "react";

import AsyncButton from "@/components/AsyncButton";
import Button from "@/components/Button";
import Select from "@/components/Select2";
import UserLink from "@/components/user/UserLink";
import { patch, useCompilers, useThisUser } from "@/lib/api";
import getTranslation from "@/lib/i18n/translate";
import type { Preset } from "@/lib/api/types";

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid gap-1 border-gray-6 border-t py-3 md:grid-cols-[10rem_1fr] md:gap-4">
            <dt className="font-medium text-gray-11 text-sm">{label}</dt>
            <dd className="min-w-0">{children}</dd>
        </div>
    );
}

export default function PresetDetails({
    initialPreset,
}: {
    initialPreset: Preset;
}) {
    const [preset, setPreset] = useState(initialPreset);
    const [isEditing, setIsEditing] = useState(false);
    const [compiler, setCompiler] = useState(preset.compiler);
    const [compilerFlags, setCompilerFlags] = useState(preset.compiler_flags);
    const user = useThisUser();
    const availableCompilers = useCompilers(preset.platform);
    const compilersTranslation = getTranslation("compilers");

    const compilerOptions = useMemo(() => {
        const options: Record<string, string> = {};
        for (const id of Object.keys(availableCompilers)) {
            options[id] = compilersTranslation.t(id);
        }
        return options;
    }, [availableCompilers, compilersTranslation]);

    const visibleCompilerFlags = isEditing
        ? compilerFlags
        : preset.compiler_flags || "None";
    const compilerFlagsRows = Math.min(
        8,
        Math.max(1, 1 + Math.floor(visibleCompilerFlags.length / 60)),
    );

    const canEdit = Boolean(
        user &&
            !user.is_anonymous &&
            (user.is_admin || user.id === preset.owner?.id),
    );

    const saveChanges = async () => {
        const updated = await patch(`/preset/${preset.id}`, {
            compiler,
            compiler_flags: compilerFlags,
        });
        setPreset(updated);
        setCompiler(updated.compiler);
        setCompilerFlags(updated.compiler_flags);
        setIsEditing(false);
    };

    const cancelEditing = () => {
        setCompiler(preset.compiler);
        setCompilerFlags(preset.compiler_flags);
        setIsEditing(false);
    };

    return (
        <section className="py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-medium text-lg tracking-tight">Preset</h2>
                {canEdit && !isEditing && (
                    <Button onClick={() => setIsEditing(true)}>
                        Edit preset
                    </Button>
                )}
            </div>

            <dl>
                <Field label="Owner">
                    {preset.owner ? (
                        <UserLink
                            user={preset.owner}
                            truncateUsername={false}
                        />
                    ) : (
                        "None"
                    )}
                </Field>
                <Field label="Compiler">
                    {isEditing && Object.keys(compilerOptions).length > 0 ? (
                        <Select
                            options={compilerOptions}
                            value={compiler}
                            onChange={setCompiler}
                        />
                    ) : (
                        <span className="inline-block rounded border border-gray-6 bg-gray-2 p-2 font-mono text-gray-11 text-sm">
                            {compilersTranslation.t(compiler)}
                        </span>
                    )}
                </Field>
                <Field label="Compiler flags">
                    <div className="grid gap-2">
                        <textarea
                            className="min-h-10 w-full resize-y rounded border border-gray-6 bg-gray-2 p-2 font-mono text-sm disabled:resize-none disabled:text-gray-11"
                            disabled={!isEditing}
                            rows={compilerFlagsRows}
                            value={visibleCompilerFlags}
                            onChange={(event) =>
                                setCompilerFlags(event.target.value)
                            }
                        />
                        {isEditing && (
                            <div className="flex gap-2">
                                <AsyncButton primary onClick={saveChanges}>
                                    Save
                                </AsyncButton>
                                <Button onClick={cancelEditing}>Cancel</Button>
                            </div>
                        )}
                    </div>
                </Field>
            </dl>
        </section>
    );
}
