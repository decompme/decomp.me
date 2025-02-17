export const defaultPromptTemplate = `You are decompiling an assembly code in {{platformAsm}} from a {{platformName}} game.

{{exampleSection}}
{{decompileRequestSection}}

Return only the code, and nothing else.

{{compilerNotes}}`;

export type PromptTemplateTags =
    | "platformAsm"
    | "platformName"
    | "exampleSection"
    | "decompileRequestSection"
    | "compilerNotes";

const agbccCompilerNotes = `The code should be written in ANSI C.
Thus, you should declare variables only at the beginning of a block.
Do NOT declare variables in the middle of a block.`;

const compilerNotes: Record<string, string> = {
    agbcc: agbccCompilerNotes,
    old_agbcc: agbccCompilerNotes,
};

export function fillPromptPlaceholders(
    rawPrompt: string,
    {
        platformAsm,
        platformName,
        exampleAsm,
        exampleSource,
        targetLanguage,
        sourceAsm,
        compilerId,
    }: {
        platformAsm: string;
        platformName: string;
        exampleAsm?: string;
        exampleSource?: string;
        targetLanguage: string;
        sourceAsm: string;
        compilerId: string;
    },
) {
    const hasExample = exampleAsm && exampleSource;

    const placeholderValues: Record<PromptTemplateTags, string> = {
        platformAsm,
        platformName,
        exampleSection: hasExample
            ? `You know that this assembly:
\`\`\`
${exampleAsm}
\`\`\`
Compiled to the last function of this code:
\`\`\`
${exampleSource}
\`\`\``
            : "",
        decompileRequestSection: `${hasExample ? "Given the above context, translate" : "Translate"} this assembly to an equivalent ${targetLanguage} code:
\`\`\`
${sourceAsm}
\`\`\``,
        compilerNotes: compilerNotes[compilerId] ?? "",
    };

    return rawPrompt
        .replace("{{platformAsm}}", placeholderValues.platformAsm)
        .replace("{{platformName}}", placeholderValues.platformName)
        .replace("{{exampleSection}}", placeholderValues.exampleSection)
        .replace(
            "{{decompileRequestSection}}",
            placeholderValues.decompileRequestSection,
        )
        .replace("{{compilerNotes}}", placeholderValues.compilerNotes);
}
