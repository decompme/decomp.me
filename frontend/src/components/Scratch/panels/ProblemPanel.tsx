import Ansi from "ansi-to-react";

export default function ProblemPanel({ text }: { text: string }) {
    return (
        <div className="h-full min-h-0 overflow-auto whitespace-pre p-1 font-mono text-xs">
            <Ansi>{text}</Ansi>
        </div>
    );
}
