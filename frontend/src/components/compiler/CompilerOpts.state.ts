export type FlagEdit = {
    flag: string;
    value: boolean;
};

export type Library = {
    name: string;
    version: string;
};

export type LibraryVersions = {
    name: string;
    supported_versions: string[];
};

function areArraysEqual<T>(left: T[], right: T[]) {
    return (
        left.length === right.length &&
        left.every((value, index) => value === right[index])
    );
}

function areLibrariesEqual(left: Library[], right: Library[]) {
    return (
        left.length === right.length &&
        left.every(
            (library, index) =>
                library.name === right[index]?.name &&
                library.version === right[index]?.version,
        )
    );
}

function splitCompilerFlags(flags: string | undefined): string[] {
    return flags?.trim().split(/\s+/).filter(Boolean) ?? [];
}

export function hasCompilerFlag(flags: string | undefined, flag: string) {
    return splitCompilerFlags(flags).includes(flag);
}

export function setCompilerFlag(
    flags: string | undefined,
    flag: string,
    enabled: boolean,
) {
    const existingFlags = splitCompilerFlags(flags).filter((f) => f !== flag);

    if (enabled && flag) {
        existingFlags.push(flag);
    }

    return existingFlags.join(" ");
}

export function applyDiffFlagEdits(flags: string[], edits: FlagEdit[]) {
    const enabledFlags = edits
        .filter((o) => o.value && o.flag)
        .map((o) => o.flag);
    const disabledFlags = edits.filter((o) => !o.value).map((o) => o.flag);

    const retainedFlags = flags.filter(
        (flag) =>
            !disabledFlags.some(
                (disabledFlag) =>
                    flag === disabledFlag ||
                    flag.startsWith(`${disabledFlag}=`),
            ),
    );

    const updatedFlags = [...retainedFlags, ...enabledFlags];

    return areArraysEqual(flags, updatedFlags) ? flags : updatedFlags;
}

export function getDiffFlagValue(
    flags: string[],
    prefix: string,
): string | undefined {
    const match = flags.find((flag) => flag.startsWith(prefix));
    if (!match) return undefined;

    return match.slice(prefix.length);
}

export function getLibraryVersionOptions(
    availableLibraries: LibraryVersions[],
    library: Library,
) {
    const availableLibrary = availableLibraries.find(
        (lib) => lib.name === library.name,
    );
    const versions = availableLibrary?.supported_versions ?? [library.version];

    return Object.fromEntries(versions.map((version) => [version, version]));
}

export function setLibraryVersion(
    libraries: Library[],
    libraryName: string,
    version: string,
) {
    const updatedLibraries = libraries.map((library) =>
        library.name === libraryName ? { ...library, version } : library,
    );

    if (updatedLibraries.some((library) => library.name === libraryName)) {
        return areLibrariesEqual(libraries, updatedLibraries)
            ? libraries
            : updatedLibraries;
    }

    return [...updatedLibraries, { name: libraryName, version }];
}

export function addLibrary(
    libraries: Library[],
    availableLibraries: LibraryVersions[],
    libraryName: string,
) {
    const availableLibrary = availableLibraries.find(
        (library) => library.name === libraryName,
    );
    const firstVersion = availableLibrary?.supported_versions[0];

    if (!firstVersion) {
        return libraries;
    }

    return setLibraryVersion(libraries, libraryName, firstVersion);
}

export function removeLibrary(libraries: Library[], libraryName: string) {
    const updatedLibraries = libraries.filter(
        (library) => library.name !== libraryName,
    );

    return updatedLibraries.length === libraries.length
        ? libraries
        : updatedLibraries;
}
