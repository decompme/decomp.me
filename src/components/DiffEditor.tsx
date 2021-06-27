import React from "react";
import { MonacoDiffEditor } from "react-monaco-editor";

interface DiffEditorProps {
    compiledAsm: string,
    originalAsm: string
}

export const DiffEditor: React.FC<DiffEditorProps> = ({ compiledAsm, originalAsm }) => {
    const options = {
        automaticLayout: true,
        minimap: {
            enabled: false
        },
        readOnly: true,
        domReadOnly: true
    };
    return (
        <MonacoDiffEditor
            language="asm"
            original={compiledAsm}
            value={originalAsm}
            options={options}
            theme="customTheme" />);
}