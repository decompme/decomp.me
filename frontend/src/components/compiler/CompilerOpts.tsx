import { useContext, useState, Fragment, type ReactElement } from "react";

import { TrashIcon } from "@primer/octicons-react";

import Checkbox from "@/app/(navfooter)/settings/Checkbox";
import Button from "@/components/Button";
import Select2 from "@/components/Select2";
import * as api from "@/lib/api";
import type { Library } from "@/lib/api/types";
import getTranslation from "@/lib/i18n/translate";

import { PlatformIcon } from "../PlatformSelect/PlatformIcon";
import Select from "../Select"; // TODO: use Select2

import styles from "./CompilerOpts.module.css";
import {
    addLibrary,
    applyCompilerFlagEdits,
    applyDiffFlagEdits,
    getDiffFlagValue,
    getLibraryVersionOptions,
    hasCompilerFlag,
    removeLibrary,
    setCompilerFlag,
    setLibraryVersion,
    type FlagEdit,
} from "./CompilerOpts.state";
import PresetSelect from "./PresetSelect";

import { OptsContext } from "./OptsContext";
import {
    StringParameterFlag,
    IntegerParameterFlag,
    HexParameterFlag,
    IntOrHexParameterFlag,
} from "./ParameterFlags";

const NO_TRANSLATION = "NO_TRANSLATION";

type CheckboxProps = { flag: string; description: string };

function FlagCheckbox({ flag, description }: CheckboxProps) {
    const { checkFlag, setFlag } = useContext(OptsContext);

    const isChecked = checkFlag(flag);

    return (
        <div className={styles.flag} onClick={() => setFlag(flag, !isChecked)}>
            <input
                type="checkbox"
                checked={isChecked}
                onChange={() => setFlag(flag, !isChecked)}
            />
            <label>{flag}</label>
            <span className={styles.flagDescription}>{description}</span>
        </div>
    );
}

function DiffCheckbox({ flag, description }: CheckboxProps) {
    const { checkFlag, setFlag } = useContext(OptsContext);

    const isChecked = checkFlag(flag);

    return (
        <div className={styles.flag} onClick={() => setFlag(flag, !isChecked)}>
            <input
                type="checkbox"
                checked={isChecked}
                onChange={() => setFlag(flag, !isChecked)}
            />
            <label>{description}</label>
        </div>
    );
}

type FlagSetProps = {
    name: string;
    children: ReactElement<FlagOptionProps>[];
    value: string;
};

function FlagSet({ name, children, value }: FlagSetProps) {
    const { setFlags } = useContext(OptsContext);

    return (
        <div className={styles.flagSet}>
            <div className={styles.flagSetName}>{name}</div>
            <Select
                onChange={(event) => {
                    const trueFlag = (event.target as HTMLSelectElement).value;

                    const edits = children.map((child) => {
                        return {
                            flag: child.props.flag,
                            value: child.props.flag === trueFlag,
                        };
                    });

                    setFlags(edits);
                }}
                value={value}
            >
                {children}
            </Select>
        </div>
    );
}

function DiffFlagSet({ name, children, value }: FlagSetProps) {
    const { setFlags } = useContext(OptsContext);

    return (
        <div className={styles.flagSet}>
            <div className={styles.flagSetName}>{name}</div>
            <Select
                onChange={(event) => {
                    const trueFlag = (event.target as HTMLSelectElement).value;

                    const edits = children.map((child) => {
                        return {
                            flag: child.props.flag,
                            value: child.props.flag === trueFlag,
                        };
                    });

                    setFlags(edits);
                }}
                value={value}
            >
                {children}
            </Select>
        </div>
    );
}

type FlagOptionProps = { flag: string; description?: string };

function FlagOption({ flag, description }: FlagOptionProps) {
    return (
        <option value={flag}>
            {flag}{" "}
            {description &&
                description !== NO_TRANSLATION &&
                `(${description})`}
        </option>
    );
}

function DiffFlagOption({ flag, description }: FlagOptionProps) {
    return <option value={flag}>{description || flag}</option>;
}

interface FlagsProps {
    schema: api.Flag[];
}

function Flags({ schema }: FlagsProps) {
    const compilersTranslation = getTranslation("compilers");
    const { checkFlag } = useContext(OptsContext);

    return (
        <>
            {schema.map((flag) => {
                if (flag.type === "checkbox") {
                    return (
                        <FlagCheckbox
                            key={flag.id}
                            flag={flag.flag}
                            description={compilersTranslation.t(flag.id)}
                        />
                    );
                } else if (flag.type === "flagset") {
                    const selectedFlag =
                        flag.flags.filter(checkFlag)[0] || "---";
                    const flagOptions = flag.flags.map((f) => (
                        <FlagOption
                            key={f}
                            flag={f}
                            description={compilersTranslation.tWithDefault(
                                `${flag.id}.${f}`,
                                NO_TRANSLATION,
                            )}
                        />
                    ));

                    return (
                        <FlagSet
                            key={flag.id}
                            name={compilersTranslation.t(flag.id)}
                            value={selectedFlag}
                        >
                            {[
                                <option value="" key={"__NULL__"}>
                                    {"---"}
                                </option>,
                                ...flagOptions,
                            ]}
                        </FlagSet>
                    );
                }
            })}
        </>
    );
}

function DiffFlags({ schema }: FlagsProps) {
    const compilersTranslation = getTranslation("compilers");
    const { checkFlag, getFlagValue } = useContext(OptsContext);

    return (
        <>
            {schema.map((flag) => {
                if (flag.type === "checkbox") {
                    return (
                        <DiffCheckbox
                            key={flag.id}
                            flag={flag.flag}
                            description={compilersTranslation.t(flag.id)}
                        />
                    );
                } else if (flag.type === "flagset") {
                    const selectedFlag =
                        flag.flags.filter(checkFlag)[0] || flag.flags[0];
                    const flagOptions = flag.flags.map((f) => (
                        <DiffFlagOption
                            key={f}
                            flag={f}
                            description={compilersTranslation.tWithDefault(
                                `${flag.id}.${f}`,
                                NO_TRANSLATION,
                            )}
                        />
                    ));

                    return (
                        <DiffFlagSet
                            key={flag.id}
                            name={compilersTranslation.t(flag.id)}
                            value={selectedFlag}
                        >
                            {flagOptions}
                        </DiffFlagSet>
                    );
                } else if (flag.type === "parameter") {
                    const value = getFlagValue(`${flag.flag}=`);
                    switch (flag.format) {
                        case "string":
                            return (
                                <StringParameterFlag
                                    key={flag.id}
                                    flag={flag.flag}
                                    name={compilersTranslation.t(flag.id)}
                                    value={value}
                                />
                            );
                        case "int":
                            return (
                                <IntegerParameterFlag
                                    key={flag.id}
                                    flag={flag.flag}
                                    name={compilersTranslation.t(flag.id)}
                                    value={value}
                                />
                            );
                        case "hex":
                            return (
                                <HexParameterFlag
                                    key={flag.id}
                                    flag={flag.flag}
                                    name={compilersTranslation.t(flag.id)}
                                    value={value}
                                />
                            );
                        case "int-or-hex":
                            return (
                                <IntOrHexParameterFlag
                                    key={flag.id}
                                    flag={flag.flag}
                                    name={compilersTranslation.t(flag.id)}
                                    value={value}
                                />
                            );
                    }
                }
            })}
        </>
    );
}

export type CompilerOptsT = {
    compiler?: string;
    compiler_flags?: string;
    diff_flags?: string[];
    preset?: number;
    libraries?: Library[];
};

export type Props = {
    platform?: string;
    value: CompilerOptsT;
    onChange: (value: CompilerOptsT) => void;

    diffLabel: string;
    onDiffLabelChange: (diffLabel: string) => void;

    matchOverride: boolean;
    onMatchOverrideChange: (matchOverride: boolean) => void;
};

export default function CompilerOpts({
    platform,
    value,
    onChange,
    diffLabel,
    onDiffLabelChange,
    matchOverride,
    onMatchOverrideChange,
}: Props) {
    const availablePresets = api.usePresets(platform);
    const availableCompilers = api.useCompilers(platform);

    const compiler = value.compiler;
    const opts = value.compiler_flags;
    const diff_opts = value.diff_flags || [];

    const setCompiler = (compiler: string) => {
        if (compiler === value.compiler) return;

        onChange({
            compiler,
            compiler_flags: opts,
            diff_flags: diff_opts,
        });
    };

    const setOpts = (opts: string) => {
        if (opts === value.compiler_flags) return;

        onChange({
            compiler,
            compiler_flags: opts,
            diff_flags: diff_opts,
        });
    };

    const setDiffOpts = (diff_opts: string[]) => {
        if (diff_opts === value.diff_flags) return;

        onChange({
            compiler,
            compiler_flags: opts,
            diff_flags: diff_opts,
        });
    };

    const setPreset = (preset: api.Preset) => {
        if (preset) {
            onChange({
                compiler: preset.compiler,
                compiler_flags: preset.compiler_flags,
                diff_flags: preset.diff_flags,
                libraries: preset.libraries,
                preset: preset.id,
            });
        } else {
            // "Custom" preset selected
            onChange({
                preset: null,
            });
        }
    };

    const setLibraries = (libraries: Library[]) => {
        if (libraries === value.libraries) return;

        onChange({
            libraries,
        });
    };

    const optsEditorProvider = {
        checkFlag(flag: string) {
            return hasCompilerFlag(opts, flag);
        },

        setFlag(flag: string, enable: boolean) {
            setOpts(setCompilerFlag(opts, flag, enable));
        },

        setFlags(edits: FlagEdit[]) {
            setOpts(applyCompilerFlagEdits(opts, edits));
        },
    };

    const diffOptsEditorProvider = {
        checkFlag(flag: string) {
            return diff_opts.includes(flag);
        },

        setFlag(flag: string, enable: boolean) {
            diffOptsEditorProvider.setFlags([{ flag, value: enable }]);
        },

        setFlags(edits: FlagEdit[]) {
            setDiffOpts(applyDiffFlagEdits(diff_opts, edits));
        },

        getFlagValue(prefix: string): string | undefined {
            return getDiffFlagValue(diff_opts, prefix);
        },
    };

    return (
        <>
            <section className={styles.header}>
                <PlatformIcon platform={platform} size={32} />
                <div className={styles.preset}>
                    Preset
                    <PresetSelect
                        availablePresets={availablePresets}
                        presetId={value.preset}
                        setPreset={setPreset}
                    />
                </div>
            </section>
            <OptsContext.Provider value={optsEditorProvider}>
                <section className={styles.section}>
                    <h3 className={styles.heading}>Compiler options</h3>
                    <OptsEditor
                        availableCompilers={availableCompilers}
                        compiler={compiler}
                        setCompiler={setCompiler}
                        opts={opts}
                        setOpts={setOpts}
                    />
                </section>
            </OptsContext.Provider>

            <LibrariesSection
                className={styles.section}
                libraries={value.libraries}
                setLibraries={setLibraries}
                platform={platform}
            />

            <OptsContext.Provider value={diffOptsEditorProvider}>
                <section className={styles.section}>
                    <h3 className={styles.heading}>Diff options</h3>
                    <DiffOptsEditor
                        platform={platform}
                        compiler={compiler}
                        diffLabel={diffLabel}
                        onDiffLabelChange={onDiffLabelChange}
                    />
                </section>
            </OptsContext.Provider>

            <section className={styles.section}>
                <h3 className={styles.heading}>Other options</h3>
                <Checkbox
                    checked={matchOverride}
                    onChange={onMatchOverrideChange}
                    label="Match override"
                    description="If checked, this scratch will be considered matching (100%)"
                />
            </section>
        </>
    );
}

export function OptsEditor({
    availableCompilers,
    compiler: compilerId,
    setCompiler,
    opts,
    setOpts,
}: {
    availableCompilers: Record<string, api.Compiler>;
    compiler: string;
    setCompiler: (compiler: string) => void;
    opts: string;
    setOpts: (opts: string) => void;
}) {
    const compilersTranslation = getTranslation("compilers");
    const compiler = availableCompilers?.[compilerId];

    return (
        <div>
            <div className={styles.row}>
                <Select
                    className={styles.compilerSelect}
                    onChange={(e) =>
                        setCompiler((e.target as HTMLSelectElement).value)
                    }
                    value={compilerId}
                >
                    {Object.keys(availableCompilers).map((id) => (
                        <option key={id} value={id}>
                            {compilersTranslation.t(id)}
                        </option>
                    ))}
                </Select>

                <input
                    type="text"
                    className={styles.textbox}
                    value={opts}
                    placeholder="No arguments"
                    spellCheck={false}
                    onChange={(e) =>
                        setOpts((e.target as HTMLInputElement).value)
                    }
                />
            </div>

            <div className={styles.flags}>
                {compilerId && compiler ? (
                    <Flags schema={compiler.flags} />
                ) : (
                    <div />
                )}
            </div>
        </div>
    );
}

export function DiffOptsEditor({
    platform,
    compiler: compilerId,
    diffLabel,
    onDiffLabelChange,
}: {
    platform?: string;
    compiler: string;
    diffLabel: string;
    onDiffLabelChange: (diffLabel: string) => void;
}) {
    const compiler = api.useCompiler(platform, compilerId);

    return (
        <div>
            <div className={styles.diffLabel}>
                <label>Diff label</label>
                <input
                    type="text"
                    className={styles.textbox}
                    value={diffLabel}
                    placeholder="Top of file"
                    spellCheck={false}
                    onChange={(e) => onDiffLabelChange(e.target.value)}
                />
            </div>
            <div className={styles.diffFlags}>
                {compilerId && compiler ? (
                    <DiffFlags schema={compiler.diff_flags} />
                ) : (
                    <div />
                )}
            </div>
        </div>
    );
}

export function LibrariesSection({
    libraries,
    setLibraries,
    platform,
    className,
}: {
    libraries: Library[];
    setLibraries: (libraries: Library[]) => void;
    platform: string;
    className?: string;
}) {
    const availableLibraries = api.useLibraries(platform);
    if (availableLibraries.length === 0) return;

    return (
        <section className={className}>
            <LibrariesEditor
                availableLibraries={availableLibraries}
                libraries={libraries}
                setLibraries={setLibraries}
            />
        </section>
    );
}

export function LibrariesEditor({
    availableLibraries,
    libraries,
    setLibraries,
}: {
    availableLibraries: api.LibraryVersions[];
    libraries: Library[];
    setLibraries: (libraries: Library[]) => void;
}) {
    const librariesTranslations = getTranslation("libraries");

    const addSelectedLibrary = (libraryName: string) =>
        setLibraries(addLibrary(libraries, availableLibraries, libraryName));
    const updateLibraryVersion = (libraryName: string, version: string) =>
        setLibraries(setLibraryVersion(libraries, libraryName, version));
    const removeSelectedLibrary = (libraryName: string) =>
        setLibraries(removeLibrary(libraries, libraryName));

    const librariesSelectOptions = availableLibraries
        // Filter out libraries that are already in the scratch
        .filter(
            (lib) =>
                !libraries.some((scratchlib) => scratchlib.name === lib.name),
        )
        // Turn them into something the Select component accepts.
        .map((lib) => [lib.name, librariesTranslations.t(lib.name)]);

    // Prepend a null value to the selector.
    const selectOptions = Object.fromEntries([
        ["__NULL__", "---"],
        ...librariesSelectOptions,
    ]);

    const scratchLibraryElements = libraries.map((lib) => (
        <Fragment key={lib.name}>
            <label className={styles.libraryName}>
                {librariesTranslations.t(lib.name)}
            </label>
            <Select2
                value={lib.version}
                onChange={(value) => updateLibraryVersion(lib.name, value)}
                options={getLibraryVersionOptions(availableLibraries, lib)}
            />
            <button
                className={styles.deleteButton}
                onClick={() => removeSelectedLibrary(lib.name)}
            >
                <TrashIcon />
                Remove library
            </button>
        </Fragment>
    ));

    const [selectedLib, setSelectedLib] = useState("__NULL__");

    return (
        <>
            <h3 className={styles.heading}>Libraries</h3>
            <div className={styles.addLibraryRow}>
                <Select2
                    value={selectedLib}
                    onChange={setSelectedLib}
                    options={selectOptions}
                    className={styles.librarySelect}
                />
                <Button primary onClick={() => addSelectedLibrary(selectedLib)}>
                    Add library
                </Button>
            </div>
            <div className={styles.librariesGrid}>{scratchLibraryElements}</div>
        </>
    );
}
