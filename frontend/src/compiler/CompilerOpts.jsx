import { h, createContext } from "preact"
import { useState, useContext } from "preact/hooks"
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
        {flag} ({description})
    </option>
}

export default function CompilerOpts() {
    const [compiler, setCompiler] = useLocalStorage("CompilerOpts.compiler", compilers[0])
    let [ccArgs, setCcArgs] = useState("-O2")

    function checkFlag(flag) {
        return ccArgs.split(" ").includes(flag)
    }

    function setFlag(flag, enable) {
        let split = ccArgs.split(" ")

        if (enable) {
            split.push(flag)
        } else {
            split = split.filter(f => f !== flag)
        }

        ccArgs = split.join(" ").trim()
        setCcArgs(ccArgs)
    }

    return <OptsContext.Provider value={{ checkFlag, setFlag }}>
        <div class={styles.container}>
            <div class={styles.row}>
                <Select class={styles.compilerSelect} onChange={e => setCompiler(compilers[parseInt(e.target.value)])}>
                    {compilers.map((c, idx) => <option
                        value={idx}
                        selected={c.name === compiler.name}
                    >
                        {c.name}
                    </option>)}
                </Select>

                <input type="text" class={styles.textbox} value={ccArgs} onChange={e => setCcArgs(e.target.value)} />
            </div>

            <div class={styles.flags}>
                {compiler ? <compiler.Flags /> : <Skeleton />}
            </div>
        </div>
    </OptsContext.Provider>
}
