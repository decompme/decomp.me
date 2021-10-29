import { createContext, useContext } from "react"

import Select from "../Select"

import styles from "./CompilerOpts.module.css"
import { useCompilersForPlatform } from "./compilers"
import PresetSelect from "./PresetSelect"

interface IOptsContext {
    checkFlag(flag: string): boolean
    setFlag(flag: string, value: boolean): void
}

const OptsContext = createContext<IOptsContext>({
    checkFlag: () => false,
    setFlag: () => {},
})

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

export type Props = {
    compiler: string
    flags: string
    onCompilerChange: (compiler: string) => void
    onFlagsChange: (flags: string) => void
    platform?: string
    title?: string
    isPopup?: boolean
}

export default function CompilerOpts({ compiler, flags, onCompilerChange, onFlagsChange, platform, title, isPopup }: Props) {
    return <OptsContext.Provider value={{
        checkFlag(flag: string) {
            return flags.split(" ").includes(flag)
        },

        setFlag(flag: string, enable: boolean) {
            const split = flags.split(" ")

            if (enable) {
                flags = flags + " " + flag
            } else {
                flags = (" " + flags + " ").replace(" " + flag + " ", " ")
            }

            flags = split.join(" ").trim()
            onFlagsChange(flags)
        },
    }}>
        <div className={styles.header} data-is-popup={isPopup}>
            {title || "Compiler Options"}
            <PresetSelect platform={platform} compiler={compiler} setCompiler={onCompilerChange} opts={flags} setOpts={onFlagsChange} />
        </div>
        <div className={styles.container} data-is-popup={isPopup}>
            <OptsEditor platform={platform} compiler={compiler} setCompiler={onCompilerChange} opts={flags} setOpts={onFlagsChange} />
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

    if (!compilerModule && compilers.length > 0) {
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
