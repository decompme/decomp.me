import { h, createContext } from "preact"
import { useState, useContext, useEffect } from "preact/hooks"
import Skeleton from "react-loading-skeleton"

import Select from "../Select"

import compilers from "./compilers"
import PresetSelect, { presets } from "./PresetSelect"
import styles from "./CompilerOpts.module.css"

interface IOptsContext {
    checkFlag(flag: string): boolean,
    setFlag(flag: string, value: boolean): void,
}

const OptsContext = createContext<IOptsContext>(undefined)

export function Checkbox({ flag, description }) {
    const { checkFlag, setFlag } = useContext(OptsContext)

    const isChecked = checkFlag(flag)

    return <div class={styles.flag} onClick={() => setFlag(flag, !isChecked)}>
        <input type="checkbox" checked={isChecked} onChange={() => setFlag(flag, !isChecked)} />
        <label>{flag}</label>
        <span class={styles.flagDescription}>{description}</span>
    </div>
}

export function FlagSet({ name, children }) {
    const { setFlag } = useContext(OptsContext)

    return <div class={styles.flagSet}>
        <div class={styles.flagSetName}>{name}</div>
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
    compiler: string,
    cc_opts: string,
}

export type Props = {
    value: CompilerOptsT,
    onChange: (value: CompilerOptsT) => void,
    title?: string,
    isPopup?: boolean,
}

export default function CompilerOpts({ value, onChange, title, isPopup }: Props) {
    const [compiler, setCompiler] = useState((value && value.compiler) || presets[0].compiler)
    let [opts, setOpts] = useState((value && value.cc_opts) || presets[0].opts)

    useEffect(() => {
        onChange({
            compiler,
            cc_opts: opts,
        })
    }, [compiler, opts]) // eslint-disable-line react-hooks/exhaustive-deps

    return <OptsContext.Provider value={{
        checkFlag(flag: string) {
            return opts.split(" ").includes(flag)
        },

        setFlag(flag: string, enable: boolean) {
            let split = opts.split(" ")

            if (enable) {
                split.push(flag)
            } else {
                split = split.filter(f => f !== flag)
            }

            opts = split.join(" ").trim()
            setOpts(opts)
        },
    }}>
        <div class={styles.header} data-is-popup={isPopup}>
            {title || "Compiler Options"}
            <PresetSelect compiler={compiler} setCompiler={setCompiler} opts={opts} setOpts={setOpts} />
        </div>
        <div class={styles.container} data-is-popup={isPopup}>
            <OptsEditor compiler={compiler} setCompiler={setCompiler} opts={opts} setOpts={setOpts} />
        </div>
    </OptsContext.Provider>
}

function OptsEditor({ compiler, setCompiler, opts, setOpts }) {
    const compilerComp = compilers[compiler]

    return <div>
        <div class={styles.row}>
            <Select
                class={styles.compilerSelect}
                onChange={e => setCompiler((e.target as HTMLSelectElement).value)}
            >
                {Object.values(compilers).map(c => <option
                    key={c.id}
                    value={c.id}
                    selected={c.name === compilerComp.name}
                >
                    {c.name}
                </option>)}
            </Select>

            <input
                type="text"
                class={styles.textbox}
                value={opts}
                placeholder="no arguments"
                onChange={e => setOpts((e.target as HTMLInputElement).value)}
            />
        </div>

        <div class={styles.flags}>
            {compiler ? <compilerComp.Flags /> : <Skeleton />}
        </div>
    </div>
}
