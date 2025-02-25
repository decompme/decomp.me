import { useState } from "react";
import CodeMirror from "@/components/Editor/CodeMirror";
import * as api from "@/lib/api";
import basicSetup from "@/lib/codemirror/basic-setup";
import { defaultPromptTemplate, fillPromptPlaceholders } from "@/lib/ai/prompt";
import getScratchDetails from "@/app/scratch/[slug]/getScratchDetails";
import TextField from "@/app/(navfooter)/settings/TextField";
import Button from "@/components/Button";
import { useAi } from "@/providers/AiProvider";
import Tooltip from "../Tooltip";

type Props = {
    scratch: api.TerseScratch;
    goToChatTab: () => void;
};

export default function PromptBuilder({ scratch, goToChatTab }: Props) {
    const { canUseAi, setNewMessage } = useAi();
    const [similarScratchLink, setSimilarScratchLink] = useState("");
    const [similarScratch, setSimilarScratch] = useState<api.Scratch>(null);
    const [rawPrompt, setRawPrompt] = useState(defaultPromptTemplate);

    const loadSimilarScratch = async () => {
        const exampleScratchSlug = similarScratchLink.split("/").pop();

        if (!exampleScratchSlug) {
            setSimilarScratch(null);
            return;
        }

        const { scratch } = await getScratchDetails(exampleScratchSlug);
        setSimilarScratch(scratch);
    };

    const getFinalPrompt = ({
        includeSourceAsm = true,
    }: { includeSourceAsm?: boolean } = {}) => {
        return fillPromptPlaceholders(rawPrompt, {
            platformAsm: scratch.platform,
            platformName: scratch.platform,
            targetLanguage: scratch.language,
            exampleAsm: similarScratch?.target_assembly_source_asm,
            exampleSource: similarScratch?.source_code,
            sourceAsm: includeSourceAsm
                ? scratch.target_assembly_source_asm
                : "",
            compilerId: scratch.compiler,
        });
    };

    const finalPrompt = getFinalPrompt();

    const getPromptSuggestions = () => {
        const suggestions = new Set<string>();

        // we need a final prompt without the source assembly to check for missing definitions
        const finalPromptWithoutAsm = getFinalPrompt({
            includeSourceAsm: false,
        });

        for (const [, func] of scratch.target_assembly_source_asm.matchAll(
            /bl\s+([\w\d]+)/g,
        )) {
            if (finalPromptWithoutAsm.includes(func)) {
                continue;
            }

            suggestions.add(
                `The target assembly calls "${func}" but it's missing a definition or example in the prompt`,
            );
        }

        return suggestions;
    };

    const promptSuggestions = getPromptSuggestions();

    return (
        <div className="flex flex-col gap-4">
            <div>
                <TextField
                    label="Similar scratch link"
                    description="Optional. Link for a fully matched scratch with similar assembly and context."
                    type="url"
                    value={similarScratchLink}
                    onChange={setSimilarScratchLink}
                    onBlur={loadSimilarScratch}
                />
            </div>

            <div>
                <label className="select-none font-semibold">
                    Prompt Template
                </label>

                <div className="mt-1 text-gray-11 text-sm">
                    Tip: Add at the end of the prompt useful information for AI,
                    such as typedef.
                </div>

                <CodeMirror
                    className="w-full flex-1 overflow-hidden rounded border border-[color:var(--g500)] bg-[color:var(--g200)] [&_.cm-editor]:h-full"
                    value={rawPrompt}
                    valueVersion={rawPrompt as any}
                    onChange={(value) => {
                        setRawPrompt(value);
                    }}
                    extensions={[basicSetup]}
                />

                <div className="mt-2 text-[0.8rem] text-[color:var(--g800)]">
                    <p>Suggestions:</p>

                    {promptSuggestions.size === 0 && <p>- None</p>}

                    {Array.from(promptSuggestions).map((suggestion, i) => (
                        <p key={i} className="pl-2">
                            - {suggestion}
                        </p>
                    ))}
                </div>
            </div>

            <div className="flex h-[200px] flex-col">
                <label className="select-none font-semibold">
                    Final Prompt
                </label>

                <div className="mt-1 text-gray-11 text-sm">Readonly.</div>

                <CodeMirror
                    className="w-full flex-1 overflow-hidden rounded border border-[color:var(--g500)] bg-[color:var(--g200)] [&_.cm-editor]:h-full"
                    value={finalPrompt}
                    readOnly
                    valueVersion={finalPrompt as any}
                    extensions={[basicSetup]}
                />
            </div>

            <div className="flex gap-1">
                <Button
                    onClick={() => {
                        navigator.clipboard.writeText(finalPrompt);
                    }}
                >
                    Copy to clipboard
                </Button>

                <Tooltip
                    message={
                        canUseAi
                            ? null
                            : "This feature is available only when an API key is set in the AI settings"
                    }
                >
                    <Button
                        disabled={!canUseAi}
                        onClick={() => {
                            setNewMessage(finalPrompt);
                            goToChatTab();
                        }}
                    >
                        Use prompt on the chat
                    </Button>
                </Tooltip>
            </div>
        </div>
    );
}
