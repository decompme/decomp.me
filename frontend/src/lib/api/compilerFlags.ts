import type {
    Compiler,
    CompilerFlagClass,
    CompilersResponse,
    Flag,
} from "./types";

export function resolveCompilerFlags(
    className: string,
    classes: Record<string, CompilerFlagClass>,
    resolved = new Map<string, Flag[]>(),
    resolving = new Set<string>(),
): Flag[] {
    const cached = resolved.get(className);
    if (cached) return cached;

    const flagClass = classes[className];
    if (!flagClass) {
        throw new Error(`Unknown compiler flag class: ${className}`);
    }
    if (resolving.has(className)) {
        throw new Error(
            `Cyclic compiler flag class inheritance at ${className}`,
        );
    }

    resolving.add(className);
    const parentFlags = flagClass.parent
        ? resolveCompilerFlags(flagClass.parent, classes, resolved, resolving)
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

    const resolved = new Map<string, Flag[]>();
    return Object.fromEntries(
        Object.entries(response.compilers).map(([id, compiler]) => [
            id,
            {
                ...compiler,
                flags: resolveCompilerFlags(
                    compiler.class,
                    response.flags,
                    resolved,
                ),
            },
        ]),
    );
}
