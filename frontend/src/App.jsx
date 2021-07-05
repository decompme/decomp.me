import { h, Fragment } from "preact"
import { useState } from "preact/hooks"
import Editor, { DiffEditor } from "@monaco-editor/react"

const DEFAULT_C_CODE = `int add(int a, int b) {
    return a + b;
}
`

function App() {
    const [cCode, setCCode] = useState(DEFAULT_C_CODE)
    const [targetAsm, setTargetAsm] = useState("/* target asm */")
    const [currentAsm, setCurrentAsm] = useState("/* press 'compile!' */")

    const compile = async () => {
        // TODO fetch POST /api/compile
        setCurrentAsm("/* compiled: */\n" + cCode)
    }

    return <>
        <nav>
            decomp.me scratchpad

            <button onClick={compile}>compile!</button>
        </nav>
        <div class="scratchpad-c">
            <Editor
                value={cCode}
                onChange={value => setCCode(value)}

                language="c"
                theme="vs-dark"
                options={{
                    minimap: {
                        enabled: false,
                    },
                }}
            />
        </div>
        <div class="scratchpad-output">
            <DiffEditor
                original={currentAsm}
                modified={targetAsm}
                onChange={value => setTargetAsm(value)}

                language="asm"
                theme="vs-dark"
                options={{
                    minimap: {
                        enabled: false,
                    },
                }}
            />
        </div>
    </>
}

export default App
