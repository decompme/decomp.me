import { h, createContext } from "preact"
import { useState, useContext, useEffect } from "preact/hooks"

import Select from "../Select"

import compilers from "./compilers"
import PresetSelect, { presets } from "./PresetSelect"
import styles from "./CompilerOpts.module.css"

const OptsContext = createContext()

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

                setFlag(event.target.value, true)
            }}
        >
            {children}
        </Select>
    </div>
}

export function FlagOption({ flag, description }) {
    const { checkFlag } = useContext(OptsContext)

    return <option
        value={flag}
        selected={checkFlag(flag)}
    >
        {flag} {description && `(${description})`}
    </option>
}

export default function CompilerOpts({ value, onChange, title, isPopup }) {
    const [compiler, setCompiler] = useState((value && value.compiler) || presets[0].compiler)
    let [opts, setOpts] = useState((value && value.cc_opts) || presets[0].opts)

    useEffect(() => {
        onChange({
            compiler: compiler,
            cc_opts: opts,
        })
    }, [compiler, opts])

    return <OptsContext.Provider value={{
        checkFlag(flag) {
            return opts.split(" ").includes(flag)
        },
    
        setFlag(flag, enable) {
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
            <Select class={styles.compilerSelect} onChange={e => setCompiler(e.target.value)}>
                {Object.values(compilers).map(c => <option
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
                onChange={e => setOpts(e.target.value)}
            />
        </div>

        <div class={styles.flags}>
            {compiler ? <compilerComp.Flags /> : <Skeleton />}
        </div>
    </div>
}
