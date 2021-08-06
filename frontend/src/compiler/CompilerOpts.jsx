import { h } from "preact"
import { useState } from "preact/hooks"

import Select from "../Select"
import CompilerConfigSelect from "../scratch/CompilerConfigSelect"

import styles from "./CompilerOpts.module.css"

function Checkbox({ flag, description, checkFlag, setFlag }) {
    const isChecked = checkFlag(flag)

    return <div class={styles.flag} onClick={() => setFlag(flag, !isChecked)}>
        <input type="checkbox" checked={isChecked} onChange={() => setFlag(flag, !isChecked)} />
        <label>{flag}</label>
        <span class={styles.flagDescription}>{description}</span>
    </div>
}

export default function CompilerOpts() {
    const [compiler, setCompiler] = useState()
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

        ccArgs = split.join("").trim()
        setCcArgs(split.join(" ").trim())
    }

    return <div class={styles.container}>
        <div class={styles.row}>
            <CompilerConfigSelect class={styles.compilerSelect} value={compiler} onChange={setCompiler} />
            <input class={styles.textbox} type="text" value={ccArgs} onChange={e => setCcArgs(e.target.value)} />
        </div>

        <div class={styles.optimisationSelect}>
            <Select
                class={styles.optimisationSelect}
                onChange={event => {
                    setFlag("-O0", false)
                    setFlag("-O1", false)
                    setFlag("-O2", false)
                    setFlag("-O3", false)
                    setFlag(event.target.value, true)
                    console.log(event.target.value)
                }}
            >
                <option value="-O0" selected={checkFlag("-O0")}>-O0 (no optimization)</option>
                <option value="-O1" selected={checkFlag("-O1")}>-O1 (optimize)</option>
                <option value="-O2" selected={checkFlag("-O2")}>-O2 (optimize more)</option>
                <option value="-O3" selected={checkFlag("-O3")}>-O3 (unsafe optimizations)</option>
            </Select>
        </div>

        <div class={styles.flags}>
            <Checkbox flag="-fforce-addr" description="Load globals into a register before usage" checkFlag={checkFlag} setFlag={setFlag} />
            <Checkbox flag="-ffreestanding" description="Assume standard library does not exist" checkFlag={checkFlag} setFlag={setFlag} />
        </div>
    </div>
}
