import { h, createContext } from "preact"
import { useState, useContext, useEffect } from "preact/hooks"

import Select from "../Select"

import arches from "./arches"
import styles from "./CompilerOpts.module.css"

const OptsContext = createContext()

export function MiscCheckbox({ flag, description }) {
    const { checkOpt, handleChange } = useContext(OptsContext)

    const isChecked = checkOpt(flag)

    return <div class={styles.flag} onClick={() => handleChange(flag)}>
        <input type="checkbox" checked={isChecked} onChange={() => handleChange(flag)} />
        <label>{flag}</label>
        <span class={styles.flagDescription}>{description}</span>
    </div>
}

export default function ArchOpts({ value, onChange }) {
    const [arch, setArch] = useState((value && value.arch) || Object.keys(arches)[0])
    const [asOpts, setAsOpts] = useState((value && value.asOpts) || "")
    let [archOpts, setArchOpts] = useState((value && value.misc_opts) || { ".set noreorder": true })

    const archComp = arches[arch]

    function checkOpt(miscFlag) {
        return true === archOpts[miscFlag]
    }

    function handleChange(name) {
        setArchOpts(preArchOpts => ({
            ...preArchOpts,
            [name]: false === preArchOpts[name] ? true : false
        }));
    };

    useEffect(() => {
        onChange({
            arch: arch,
            as_opts: asOpts,
            arch_opts: archOpts,
        })
    }, [arch, asOpts, archOpts])

    return <OptsContext.Provider value={{ checkOpt, handleChange }}>
        <div class={styles.container}>
            <div class={styles.row}>
                <Select class={styles.compilerSelect} onChange={e => setArch(e.target.value)}>
                    {Object.values(arches).map(c => <option
                        value={c.id}
                        selected={c.name === archComp.name}
                    >
                        {c.name}
                    </option>)}
                </Select>
            </div>

            <div class={styles.flags}>
                {archComp ? <archComp.Flags /> : <Skeleton />}
            </div>
        </div>
    </OptsContext.Provider>
}
