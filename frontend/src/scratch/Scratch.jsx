import { h, Fragment } from "preact"
import { useEffect, useState } from "preact/hooks"
import { useDebouncedCallback }  from "use-debounce"
import * as resizer from "react-simple-resizer"
import toast from "react-hot-toast"
import Skeleton from "react-loading-skeleton"

import * as api from "../api"
import CompilerConfigSelect from "./CompilerConfigSelect"
import Editor from "./Editor"

import styles from "./Scratch.module.css"

export default function Scratch({ slug }) {
    let [compilerConfig, setCompilerConfig] = useState(null)
    let [cCode, setCCode] = useState(null)
    let [cContext, setCContext] = useState(null)
    let [diff, setDiff] = useState(null)
    let [log, setLog] = useState(null)

    const compile = async () => {
        if (compilerConfig === null || cCode === null || cContext === null) {
            return
        }

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

    const save = async () => {
        const promise = api.patch(`/scratch/${slug}`, {
            compiler_config: compilerConfig,
            source_code: cCode,
            context: cContext,
        }).catch(error => error.message)

        toast.promise(promise, {
            loading: 'Saving...',
            success: 'Scratch saved!',
            error: 'Error saving scratch',
        })
    }

    useEffect(async () => {
        const { compiler_config, source_code, context } = await api.get(`/scratch/${slug}`)
        
        setCompilerConfig(compiler_config)
        setCContext(context)
        setCCode(source_code)
        
        compilerConfig = compiler_config
        cContext = context
        cCode = source_code
        compile()
    }, [slug])

    // Recompile automatically
    const debounced = useDebouncedCallback(compile, 1000)

    // Ctrl + S to save
    useEffect(() => {
        const handler = event => {
            if (event.ctrlKey && event.key == "s") {
                event.preventDefault()
                save()
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
                onChange={cc => {
                    compilerConfig = cc
                    setCompilerConfig(cc)
                    compile()
                }}
            />

            <div>
                <button onClick={compile} class={styles.compile}>compile</button>
                <button onClick={save} class={styles.compile}>save</button>
            </div>
        </div>

        <div class={styles.context}>
            <p>context</p>
        </div>
        
        <resizer.Container class={styles.resizer}>
            <resizer.Section minSize={200}>
                {cCode === null ? <Skeleton /> : <Editor
                    value={cCode}
                    onChange={value => debounced(setCCode(value))}
                />}
            </resizer.Section>

            <resizer.Bar size={20} style={{ cursor: 'col-resize' }} />

            <resizer.Section minSize={400}>
                {(diff === null && log === null) ? <Skeleton height="20px" count={20} /> : <>
                    <code class={styles.log}>{log}</code>
                    <code class={styles.diff} dangerouslySetInnerHTML={{ __html: diff }} />
                </>}
            </resizer.Section>
        </resizer.Container>
    </div>
}
