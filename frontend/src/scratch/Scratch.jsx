import { h, Fragment } from "preact"
import { useEffect, useState } from "preact/hooks"
import { useDebouncedCallback }  from "use-debounce"
import * as resizer from "react-simple-resizer"
import toast from "react-hot-toast"
import Skeleton from "react-loading-skeleton"

import * as api from "../api"
import CompilerConfigSelect from "./CompilerConfigSelect"
import Editor from "./Editor"
import ExpandToggle from "../ExpandToggle"

import styles from "./Scratch.module.css"

export default function Scratch({ slug }) {
    let [compilerConfig, setCompilerConfig] = useState(null)
    let [cCode, setCCode] = useState(null)
    let [cContext, setCContext] = useState(null)
    let [diff, setDiff] = useState(null)
    let [log, setLog] = useState(null)
    const [isYours, setIsYours] = useState(false)

    const compile = async () => {
        if (compilerConfig === null || cCode === null || cContext === null) {
            return
        }

        const { diff_output, errors } = await api.post(`/scratch/${slug}/compile`, {
            compiler_config: compilerConfig,
            source_code: cCode.replace(/\r\n/g, "\n"),
            context: cContext.replace(/\r\n/g, "\n"),
        })

        setLog(errors)
        setDiff(diff_output)
    }

    const save = async () => {
        if (!isYours) {
            // TODO: implicitly fork
            toast.error("You don't own this scratch, so you can't save over it.")
            return
        }

        const promise = api.patch(`/scratch/${slug}`, {
            compiler_config: compilerConfig,
            source_code: cCode,
            context: cContext,
        }).catch(error => Promise.reject(error.message))

        toast.promise(promise, {
            loading: 'Saving...',
            success: 'Scratch saved!',
            error: 'Error saving scratch',
        })
    }

    useEffect(async () => {
        const { scratch, is_yours } = await api.get(`/scratch/${slug}`)

        setIsYours(is_yours)
        setCompilerConfig(scratch.compiler_config)
        setCContext(scratch.context)
        setCCode(scratch.source_code)
        
        compilerConfig = scratch.compiler_config
        cContext = scratch.context
        cCode = scratch.source_code
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

                <button
                    onClick={save}
                    class={styles.compile}
                    disabled={!isYours}
                    title={isYours ? "" : "You don't own this scratch."}    
                >
                    save
                </button>
            </div>
        </div>
        
        <resizer.Container class={styles.resizer}>
            <resizer.Section minSize={200}>
                <ExpandToggle label="Context">
                    <div class={styles.context}>
                        <Editor
                            value={cContext}
                            onChange={value => debounced(setCContext(value))}
                        />
                    </div>
                </ExpandToggle>

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
