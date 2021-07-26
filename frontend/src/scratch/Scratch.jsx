import { h } from "preact"
import { useEffect, useState } from "preact/hooks"
import { useDebouncedCallback }  from "use-debounce"
import * as resizer from "react-simple-resizer"
import { DiffEditor } from "@monaco-editor/react" // TEMP

import * as api from "../api"
import CompilerConfigSelect from "./CompilerConfigSelect"
import Editor from "./Editor"

import styles from "./Scratch.module.css"

export default function Scratch({ slug }) {
    const [compilerConfig, setCompilerConfig] = useState(null)

    const [cCode, setCCode] = useState()
    const [cContext, setCContext] = useState()
    const [targetAsm, setTargetAsm] = useState()
    const [currentAsm, setCurrentAsm] = useState()

    useEffect(() => {
        api.get(`/scratch/${slug}`)
            .then(data => {
                setCompilerConfig(data.compiler_config)
                setCCode(data.source_code)
                setCContext(data.context)
            })
    }, [])

    const compile = async () => {
        const { compiled_asm, target_asm } = await api.post(`/scratch/${slug}/compile`, {
            compiler_config: compilerConfig,
            code: cCode,
            context: cContext,
        })

        setCurrentAsm(compiled_asm)
        setTargetAsm(target_asm)
    }

    // Recompile automatically
    const debounced = useDebouncedCallback(compile, 1000)

    // Ctrl + S to compile
    useEffect(() => {
        const handler = event => {
            if (event.ctrlKey && event.key == "s") {
                event.preventDefault()
                compile()
            }
        }

        document.addEventListener("keydown", handler)
        return () => document.removeEventListener("keydown", handler)
    })

    return <div class={styles.container}>
        <div class={styles.toolbar}>
            <CompilerConfigSelect
                value={compilerConfig}
                onChange={id => {
                    setCompilerConfig(id)
                    compile()
                }}
            />

            <button onClick={compile} class={styles.compile}>compile</button>
        </div>

        <resizer.Container class={styles.resizer}>
            <resizer.Section minSize={200}>
                <Editor
                    value={cCode}
                    onChange={value => debounced(setCCode(value))}
                />
            </resizer.Section>

            <resizer.Bar size={20} style={{ cursor: 'col-resize' }} />

            <resizer.Section minSize={400}>
                <DiffEditor
                    original={currentAsm}
                    modified={targetAsm}

                    language="asm"
                    theme="vs-dark"
                    options={{
                        minimap: {
                            enabled: false,
                        },
                    }}
                />
            </resizer.Section>
        </resizer.Container>
    </div>
}
