import debounce from "lodash.debounce";
import { useCallback, useEffect, useState } from "react";
import { RouteComponentProps } from "react-router";
import { CodeEditor } from "../components/CodeEditor"
import { DiffEditor } from "../components/DiffEditor";
import { API_URL, CEXPLORE_URL, COMPILE_DEBOUNCE_TIME } from "../constants";
import { Func } from "../types";

interface Params {
    project: string,
    function: string
}
const EditorPage: React.FC<RouteComponentProps<Params>> = ({ match }) => {

    // State
    const [cCode, setCCode] = useState(
        '// Type your c code here...'
    )
    const [compiled, setCompiled] = useState(
        {
            asm: 'The compiled asm of your code will appear here...',
            stderr: 'Compiler Output will appear here...'
        }

    )
    const [originalAsm, setOriginalAsm] = useState(
        'original asm'
    )

    const [func, setFunc] = useState<Func>({ id: 0, projectId: 0, name: 'Loading' })




    const debouncedCompile =
        useCallback(
            debounce(nextValue => compile(nextValue), COMPILE_DEBOUNCE_TIME), []);

    const onCodeChange = (newValue: any) => {
        setCCode(newValue)
        debouncedCompile(newValue);
    }

    const compile = async (nextValue: any) => {
        console.log('compiling', nextValue);
        const res = await fetch(CEXPLORE_URL, {
            "headers": {
                "accept": "application/json, text/javascript, */*; q=0.01",
                //"accept-language": "en-US,en;q=0.9",
                "content-type": "application/json",
                //"x-requested-with": "XMLHttpRequest"
            },
            //      "referrer": "http://cexplore.henny022.de/",
            //"referrerPolicy": "strict-origin-when-cross-origin",
            "body":
                JSON.stringify({
                    source: nextValue,
                    compiler: "tmc_agbcc",
                    options: {
                        userArguments: '',
                        compilerOptions: {
                            produceGccDump: {},
                            produceCfg: false
                        },
                        filters: {
                            labels: true,
                            binary: false,
                            commentOnly: true,
                            demangle: true,
                            directives: true,
                            execute: false,
                            intel: true,
                            libraryCode: false,
                            trim: false
                        },
                        tools: [],
                        libraries: []
                    },
                    lang: "c",
                    allowStoreCodeDebug: true
                }),

            "method": "POST",
            //"mode": "cors",
            //"credentials": "omit"
        });

        const data = await res.json();
        console.log(data);

        const code = data.asm.map((line: any) => line.text).join('\n')
        setCompiled({
            asm: code,
            stderr: data.stderr.map((line: any) => line.text).join('\n')
        })
    }


    const loadFunction = async (id: string) => {
        const res = await fetch(API_URL + 'functions/' + id)
        const data = await res.json()
        setFunc(data)
        if (data.cCode !== undefined) {
            setCCode(data.cCode)
            debouncedCompile(data.cCode);
        }
        if (data.asmCode !== undefined) {
            setOriginalAsm(data.asmCode)
        }
    }

    useEffect(() => {
        loadFunction(match.params.function)
    }, [match.params.function]) // TODO why does it want me to add loadFunction as a dependency here?


    return (
        <>
            <h2 style={{ marginLeft: "50px" }}>{func.name}</h2>
            <div style={{
                flexDirection: 'row',
                flex: '1',
                display: 'flex',
                flexGrow: 1,
                padding: '40px',
                paddingTop: '0px',
                boxSizing: 'border-box',
                overflow: 'hidden',
            }}
            >

                <div style={{
                    flex: 1,
                    flexDirection: 'column',
                    display: 'flex'
                }}>

                    <div style={{
                        flexGrow: 1,
                        maxHeight: '70%'
                    }}>
                        {/* <span className="label">C Code</span> x*/}

                        <CodeEditor
                            code={cCode}
                            onCodeChange={onCodeChange}
                        />

                    </div>
                    <div style={{
                        flexGrow: 1,
                        flexBasis: 'auto',
                        paddingTop: '20px'
                    }}>
                        <div style={{
                            fontFamily: 'monospace',
                            backgroundColor: '#282932',
                            color: '#d4d4d4',
                            boxSizing: 'border-box',
                            padding: '20px',
                            height: '100%',
                            whiteSpace: 'pre'
                        }}>

                            {compiled.stderr}
                        </div>
                    </div>

                </div>
                <div className="spacer" style={{ width: "40px" }} />
                <div style={{
                    width: "50%",
                    display: "flex",
                    flexDirection: "column"
                }}>
                    <div style={{
                        flexGrow: 1
                    }}>
                        <DiffEditor
                            compiledAsm={compiled.asm}
                            originalAsm={originalAsm}
                        />
                    </div>
                    <div style={{
                        marginTop: "20px",
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center"
                    }}>
                        <span>
                            Calculate score server side and show here
                    </span>
                        <button className="success" style={{
                            color: '#fff',
                            border: "none",
                            padding: "10px 30px",
                            borderRadius: "4px",
                            marginLeft: "20px",
                            cursor: "pointer",
                            display: "inline-block"
                        }}>Submit</button>
                    </div>
                </div>
            </div>
        </>
    )
}

export default EditorPage;