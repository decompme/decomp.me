import type {
    Compiler,
    CompilersResponse,
    Flag,
    FlagClass,
    Language,
} from "./types";

export function normalizeCompilerFlag(flag: string | undefined): string {
    return flag?.trim().replace(/\s+/g, " ") ?? "";
}

export function splitCompilerFlags(
    flags: string | undefined,
    knownFlags: string[] = [],
): string[] {
    const normalizedFlags = normalizeCompilerFlag(flags ?? "");
    if (!normalizedFlags) return [];

    const normalizedKnownFlags = knownFlags
        .map(normalizeCompilerFlag)
        .filter(Boolean)
        .sort((left, right) => right.length - left.length);

    const compilerFlags: string[] = [];
    let index = 0;

    while (index < normalizedFlags.length) {
        const knownFlag = normalizedKnownFlags.find((flag) => {
            if (!normalizedFlags.startsWith(flag, index)) return false;

            const next = normalizedFlags[index + flag.length];
            return next === undefined || next === " ";
        });

        if (knownFlag) {
            compilerFlags.push(knownFlag);
            index += knownFlag.length + 1;
            continue;
        }

        const nextSpace = normalizedFlags.indexOf(" ", index);
        const end = nextSpace === -1 ? normalizedFlags.length : nextSpace;
        compilerFlags.push(normalizedFlags.slice(index, end));
        index = end + 1;
    }

    return compilerFlags;
}

export function hasCompilerFlag(
    flags: string | undefined,
    flag: string,
): boolean {
    const normalizedFlag = normalizeCompilerFlag(flag);
    return splitCompilerFlags(flags, [normalizedFlag]).includes(normalizedFlag);
}

export function resolveCompilerLanguage(
    compiler: Compiler | undefined,
    compilerFlags: string,
): Language | undefined {
    if (!compiler) return undefined;

    return (
        compiler.language.overrides.find(({ flag }) =>
            hasCompilerFlag(compilerFlags, flag),
        ) ?? compiler.language.default
    );
}

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
