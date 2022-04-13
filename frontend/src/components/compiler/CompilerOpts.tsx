import { createContext, useContext } from "react"

import useTranslation from "next-translate/useTranslation"

import * as api from "../../lib/api"
import PlatformIcon from "../PlatformSelect/PlatformIcon"
import Select from "../Select" // TODO: use Select2

import styles from "./CompilerOpts.module.css"
import { useCompilersForPlatform } from "./compilers"
import PresetSelect from "./PresetSelect"

const NO_TRANSLATION = "NO_TRANSLATION"

interface IOptsContext {
    checkFlag(flag: string): boolean
    setFlag(flag: string, value: boolean): void
}

const OptsContext = createContext<IOptsContext>(undefined)

function Checkbox({ flag, description }) {
    const { checkFlag, setFlag } = useContext(OptsContext)

    const isChecked = checkFlag(flag)

    return <div className={styles.flag} onClick={() => setFlag(flag, !isChecked)}>
        <input type="checkbox" checked={isChecked} onChange={() => setFlag(flag, !isChecked)} />
        <label>{flag}</label>
        <span className={styles.flagDescription}>{description}</span>
    </div>
}

function FlagSet({ name, children, value }) {
    const { setFlag } = useContext(OptsContext)

    return <div className={styles.flagSet}>
        <div className={styles.flagSetName}>{name}</div>
        <Select
            onChange={event => {
                for (const child of children) {
                    setFlag(child.props.flag, false)
                }

                setFlag((event.target as HTMLSelectElement).value, true)
            }}
            value={value}
        >
            {children}
        </Select>
    </div>
}

function FlagOption({ flag, description }: { flag: string, description?: string }) {
    return <option value={flag}>
        {flag} {description && description !== NO_TRANSLATION && `(${description})`}
    </option>
}

interface FlagsProps {
    schema: api.Flag[]
}

function Flags({ schema }: FlagsProps) {
    const compilersTranslation = useTranslation("compilers")
    const { checkFlag } = useContext(OptsContext)

    return <>
        {schema.map(flag => {
            if (flag.type === "checkbox") {
                return <Checkbox key={flag.id} flag={flag.flag} description={compilersTranslation.t(flag.id)} />
            } else if (flag.type === "flagset") {
                const selectedFlag = flag.flags.filter(checkFlag)[0] || flag.flags[0]
                return <FlagSet key={flag.id} name={compilersTranslation.t(flag.id)} value={selectedFlag}>
                    {flag.flags.map(f => <FlagOption key={f} flag={f} description={
                        compilersTranslation.t(flag.id + "." + f, null, { default: NO_TRANSLATION })
                    } />)}
                </FlagSet>
            }
        })}
    </>
}

export type CompilerOptsT = {
    compiler: string
    compiler_flags: string
    diff_flags: string[]
    preset: string
}

export type Props = {
    platform?: string
    value: CompilerOptsT
    onChange: (value: CompilerOptsT) => void

    diffLabel: string
    onDiffLabelChange: (diffLabel: string) => void
}

export default function CompilerOpts({ platform, value, onChange, diffLabel, onDiffLabelChange }: Props) {
    const compiler = value.compiler
    let opts = value.compiler_flags
    const diff_opts = value.diff_flags || []
    const display_diff_opts = useCompilersForPlatform(platform)[compiler].diff_flags.length > 0

    const setCompiler = (compiler: string) => {
        onChange({
            compiler,
            compiler_flags: opts,
            diff_flags: diff_opts,
            preset: "",
        })
    }

    const setOpts = (opts: string) => {
        onChange({
            compiler,
            compiler_flags: opts,
            diff_flags: diff_opts,
            preset: "",
        })
    }

    const setDiffOpts = (diff_opts: string[]) => {
        onChange({
            compiler,
            compiler_flags: opts,
            diff_flags: diff_opts,
            preset: "",
        })
    }

    const setPreset = (preset: api.CompilerPreset) => {
        onChange({
            compiler: preset.compiler,
            compiler_flags: preset.flags,
            diff_flags: preset.diff_flags,
            preset: preset.name,
        })
    }

    return <div>
        <section className={styles.header}>
            <PlatformIcon platform={platform} size={32} />
            <div className={styles.preset}>
                Preset
                <PresetSelect platform={platform} presetName={value.preset} setPreset={setPreset} />
            </div>
        </section>
        <OptsContext.Provider value={{
            checkFlag(flag: string) {
                return (" " + opts + " ").includes(" " + flag + " ")
            },

            setFlag(flag: string, enable: boolean) {
                if (enable) {
                    opts = opts + " " + flag
                } else {
                    opts = (" " + opts + " ").replace(" " + flag + " ", " ")
                }
                opts = opts.trim()
                setOpts(opts)
            },
        }}>
            <section className={styles.section}>
                <h3 className={styles.heading}>Compiler options</h3>
                <OptsEditor platform={platform} compiler={compiler} setCompiler={setCompiler} opts={opts} setOpts={setOpts} />
            </section>
        </OptsContext.Provider>
        <OptsContext.Provider value={{
            checkFlag(flag: string) {
                return diff_opts.includes(flag)
            },

            setFlag(flag: string, enable: boolean) {
                if (enable && !diff_opts.includes(flag)) {
                    setDiffOpts([...diff_opts, flag])
                } else if (!enable && diff_opts.includes(flag)) {
                    setDiffOpts(diff_opts.filter(o => o != flag))
                }
            },
        }}>
            {display_diff_opts &&
            <section className={styles.section}>
                <h3 className={styles.heading}>Diff options</h3>
                <div className={styles.diffLabel}>
                    <label>Diff label</label>
                    <input
                        type="text"
                        className={styles.textbox}
                        value={diffLabel}
                        placeholder="Top of file"
                        onChange={e => onDiffLabelChange(e.target.value)}
                    />
                </div>
                <DiffOptsEditor platform={platform} compiler={compiler} />
            </section>}
        </OptsContext.Provider>
    </div>
}

export function OptsEditor({ platform, compiler: compilerId, setCompiler, opts, setOpts }: {
    platform?: string
    compiler: string
    setCompiler: (compiler: string) => void
    opts: string
    setOpts: (opts: string) => void
}) {
    const compilersTranslation = useTranslation("compilers")

    const compilers = useCompilersForPlatform(platform)
    const compiler = compilers[compilerId]

    if (!compiler) {
        // TODO: this is a bug -- we should just render like an empty state
        console.warn("compiler not supported for platform", compilerId, platform)
        setCompiler(Object.keys(compilers)[0]) // pick first compiler (ew)
    }

    return <div>
        <div className={styles.row}>
            <Select
                className={styles.compilerSelect}
                onChange={e => setCompiler((e.target as HTMLSelectElement).value)}
                value={compilerId}
            >
                {Object.keys(compilers).map(id => <option
                    key={id}
                    value={id}
                >
                    {compilersTranslation.t(id)}
                </option>)}
            </Select>

            <input
                type="text"
                className={styles.textbox}
                value={opts}
                placeholder="No arguments"
                onChange={e => setOpts((e.target as HTMLInputElement).value)}
            />
        </div>

        <div className={styles.flags}>
            {(compilerId && compiler) ? <Flags schema={compiler.flags} /> : <div />}
        </div>
    </div>
}

export function DiffOptsEditor({ platform, compiler: compilerId }: {
    platform?: string
    compiler: string
}) {
    const compilers = useCompilersForPlatform(platform)
    const compiler = compilers[compilerId]

    return <div>
        <div className={styles.diffFlags}>
            {(compilerId && compiler) ? <Flags schema={compiler.diff_flags} /> : <div />}
        </div>
    </div>
}
