"use client";

import { useState } from "react";

import AsyncButton from "@/components/AsyncButton";
import Button from "@/components/Button";
import UserLink from "@/components/user/UserLink";
import { patch, useThisUser } from "@/lib/api";
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
    const [compilerFlags, setCompilerFlags] = useState(preset.compiler_flags);
    const user = useThisUser();
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

    const saveCompilerFlags = async () => {
        const updated = await patch(`/preset/${preset.id}`, {
            compiler_flags: compilerFlags,
        });
        setPreset(updated);
        setCompilerFlags(updated.compiler_flags);
        setIsEditing(false);
    };

    const cancelEditing = () => {
        setCompilerFlags(preset.compiler_flags);
        setIsEditing(false);
    };

    return (
        <section className="py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-medium text-lg tracking-tight">Preset</h2>
                {canEdit && !isEditing && (
                    <Button onClick={() => setIsEditing(true)}>
                        Edit compiler flags
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
                <Field label="Compiler ID">
                    <span className="inline-block rounded border border-gray-6 bg-gray-2 p-2 font-mono text-gray-11 text-sm">
                        {preset.compiler}
                    </span>
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
                                <AsyncButton
                                    primary
                                    onClick={saveCompilerFlags}
                                >
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
