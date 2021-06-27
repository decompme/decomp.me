import MonacoEditor from "react-monaco-editor";

interface CodeEditorProps {
    code: string,
    onCodeChange: (text: string) => void
}

export const CodeEditor: React.FC<CodeEditorProps> = ({code, onCodeChange}) => {
    const options = {
        automaticLayout: true,
        minimap: {
          enabled: false
        }
      };

      // Focus this editor at the beginning
      const editorDidMount = (editor: any, monaco: any) => {
        editor.focus();
      }
    

    

        return (
            <MonacoEditor
            width="100%"
            height="100%"
            language="cpp"
            theme="customTheme"
            value={code}
             
            options={options}
            onChange={onCodeChange}
            editorDidMount={editorDidMount}
          />
        );
}