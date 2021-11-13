import { createContext, useContext } from "react"

import Select from "../Select"

import styles from "./CompilerOpts.module.css"
import { useCompilersForPlatform } from "./compilers"
import PresetSelect from "./PresetSelect"

interface IOptsContext {
    checkFlag(flag: string): boolean
    setFlag(flag: string, value: boolean): void
}

const OptsContext = createContext<IOptsContext>(undefined)

export function Checkbox({ flag, description }) {
    const { checkFlag, setFlag } = useContext(OptsContext)

    const isChecked = checkFlag(flag)

    return <div className={styles.flag} onClick={() => setFlag(flag, !isChecked)}>
        <input type="checkbox" checked={isChecked} onChange={() => setFlag(flag, !isChecked)} />
        <label>{flag}</label>
        <span className={styles.flagDescription}>{description}</span>
    </div>
}

export function FlagSet({ name, children }) {
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
        >
            {children}
        </Select>
    </div>
}

export function FlagOption({ flag, description }: { flag: string, description?: string }) {
    const { checkFlag } = useContext(OptsContext)

    return <option
        value={flag}
        selected={checkFlag(flag)}
    >
        {flag} {description && `(${description})`}
    </option>
}

export type CompilerOptsT = {
    compiler: string
    compiler_flags: string
}

export type Props = {
    platform?: string
    value: CompilerOptsT
    onChange: (value: CompilerOptsT) => void
    title?: string
    isPopup?: boolean
}

export default function CompilerOpts({ platform, value, onChange, title, isPopup }: Props) {
    const compiler = value.compiler
    let opts = value.compiler_flags

    const setCompiler = (compiler: string) => {
        onChange({
            compiler,
            compiler_flags: opts,
        })
    }

    const setOpts = (opts: string) => {
        onChange({
            compiler,
            compiler_flags: opts,
        })
    }

    const setPreset = (preset: { name: string, compiler: string, opts: string }) => {
        onChange({
            compiler: preset.compiler,
            compiler_flags: preset.opts,
        })
    }

    return <OptsContext.Provider value={{
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
        <div className={styles.header} data-is-popup={isPopup}>
            {title || "Compiler Options"}
            <PresetSelect platform={platform} compiler={compiler} opts={opts} setPreset={setPreset} />
        </div>
        <div className={styles.container} data-is-popup={isPopup}>
            <OptsEditor platform={platform} compiler={compiler} setCompiler={setCompiler} opts={opts} setOpts={setOpts} />
        </div>
    </OptsContext.Provider>
}

export function OptsEditor({ platform, compiler, setCompiler, opts, setOpts }: {
    platform?: string
    compiler: string
    setCompiler: (compiler: string) => void
    opts: string
    setOpts: (opts: string) => void
}) {
    const compilers = useCompilersForPlatform(platform)
    const compilerModule = compilers?.find(c => c.id === compiler)

    if (!compilerModule) {
        console.warn("compiler not supported for platform", compiler, platform)
        setCompiler(compilers[0].id)
    }

    return <div>
        <div className={styles.row}>
            <Select
                className={styles.compilerSelect}
                onChange={e => setCompiler((e.target as HTMLSelectElement).value)}
            >
                {Object.values(compilers).map(c => <option
                    key={c.id}
                    value={c.id}
                    selected={c.id === compilerModule?.id}
                >
                    {c.name}
                </option>)}
            </Select>

            <input
                type="text"
                className={styles.textbox}
                value={opts}
                placeholder="no arguments"
                onChange={e => setOpts((e.target as HTMLInputElement).value)}
            />
        </div>

        <div className={styles.flags}>
            {(compiler && compilerModule) ? <compilerModule.Flags /> : <div />}
        </div>
    </div>
}
