import type { Compiler, FlagClass, CompilersResponse, Flag } from "./types";

export function resolveFlags(
    className: string,
    classes: Record<string, FlagClass>,
    resolved = new Map<string, Flag[]>(),
    resolving = new Set<string>(),
): Flag[] {
    const cached = resolved.get(className);
    if (cached) return cached;

    const flagClass = classes[className];
    if (!flagClass) {
        throw new Error(`Unknown flag class: ${className}`);
    }
    if (resolving.has(className)) {
        throw new Error(`Cyclic flag class inheritance at ${className}`);
    }

    resolving.add(className);
    const parentFlags = flagClass.parent
        ? resolveFlags(flagClass.parent, classes, resolved, resolving)
        : [];
    resolving.delete(className);

    const flags = [...parentFlags, ...flagClass.flags];
    resolved.set(className, flags);
    return flags;
}

export function resolveCompilersResponse(
    response: CompilersResponse | undefined,
): Record<string, Compiler> {
    if (!response) return {};

    const resolvedCompilerFlags = new Map<string, Flag[]>();
    const resolvedDiffFlags = new Map<string, Flag[]>();
    return Object.fromEntries(
        Object.entries(response.compilers).map(([id, compiler]) => [
            id,
            {
                ...compiler,
                flags: resolveFlags(
                    compiler.flags_class,
                    response.flags,
                    resolvedCompilerFlags,
                ),
                diff_flags: resolveFlags(
                    compiler.diff_flags_class,
                    response.diff_flags,
                    resolvedDiffFlags,
                ),
            },
        ]),
    );
}
