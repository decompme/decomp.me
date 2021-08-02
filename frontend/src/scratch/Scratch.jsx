import { h } from "preact"
import { useEffect, useState } from "preact/hooks"
import { useDebouncedCallback }  from "use-debounce"
import * as resizer from "react-simple-resizer"
import toast from "react-hot-toast"

import * as api from "../api"
import CompilerConfigSelect from "./CompilerConfigSelect"
import Editor from "./Editor"

import styles from "./Scratch.module.css"

export default function Scratch({ slug }) {
    const [compilerConfig, setCompilerConfig] = useState(null)

    const [cCode, setCCode] = useState()
    const [cContext, setCContext] = useState()
    const [diff, setDiff] = useState()
    const [log, setLog] = useState()

    // TODO: preload this and compile output with a wrapper component of some kind
    useEffect(() => {
        api.get(`/scratch/${slug}`)
            .then(data => {
                setCompilerConfig(data.compiler_config)
                setCCode(data.source_code)
                setCContext(data.context)
            })
    }, [])

    const compile = async () => {
        const { diff_output, errors } = await api.post(`/scratch/${slug}/compile`, {
            compiler_config: compilerConfig,
            source_code: cCode,
            context: cContext,
        })

        setLog(errors)

        if (diff_output) {
            setDiff(diff_output)
        }
    }

    const update = async () => {
        const { errors } = await api.patch(`/scratch/${slug}`, {
            compiler_config: compilerConfig,
            source_code: cCode,
            context: cContext,
        })
        .then(
            toast.success("Scratch updated!")
        )

        setLog(errors)
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
            <button onClick={update} class={styles.compile}>update</button>
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
                <code class={styles.log}>{log}</code>
                <code class={styles.diff} dangerouslySetInnerHTML={{ __html: diff }} />
            </resizer.Section>
        </resizer.Container>
    </div>
}
