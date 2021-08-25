import { h, createContext, options } from "preact"
import { useState, useContext, useEffect } from "preact/hooks"
import { useLocalStorage } from "../hooks"

import Select from "../Select"

import compilers from "./compilers"
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

export default function CompilerOpts({ value, onChange }) {
    const [compiler, setCompiler] = useState((value && value.compiler) || Object.keys(compilers)[0])
    let [ccOpts, setCcOpts] = useState((value && value.cc_opts) || "")

    const compilerComp = compilers[compiler]

    useEffect(() => {
        onChange({
            compiler: compiler,
            cc_opts: ccOpts,
        })
    }, [compiler, ccOpts])

    function checkFlag(flag) {
        return ccOpts.split(" ").includes(flag)
    }

    function setFlag(flag, enable) {
        let split = ccOpts.split(" ")

        if (enable) {
            split.push(flag)
        } else {
            split = split.filter(f => f !== flag)
        }

        ccOpts = split.join(" ").trim()
        setCcOpts(ccOpts)
    }

    return <OptsContext.Provider value={{ checkFlag, setFlag }}>
        <div class={styles.container}>
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
                    value={ccOpts}
                    placeholder="no arguments"
                    onChange={e => setCcOpts(e.target.value)}
                />
            </div>

            <div class={styles.flagSetName}>Presets</div>
            <div class={styles.row}>
                <Select class={styles.compilerSelect} onChange={e => setCcOpts(e.target.value)}>
                    <option value="">-</option>
                    {Object.keys(compilerComp.presets).map(key => <option
                        value={compilerComp.presets[key]}
                    >
                        {key}
                    </option>)}
                </Select>
            </div>

            <div class={styles.flags}>
                {compilerComp ? <compilerComp.Flags /> : <Skeleton />}
            </div>
        </div>
    </OptsContext.Provider>
}
