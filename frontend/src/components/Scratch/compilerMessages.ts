export type CompilerMessagePart =
    | { type: "text"; text: string }
    | { type: "sourceLine"; text: string; line: number };

const SOURCE_LINE_LOCATION_PATTERNS = [
    /(^|[^\w./-])(src\.[A-Za-z0-9]+:(\d+))(?=[:\s]|$)/g,
    /(^|[^\w./-])("?src\.[A-Za-z0-9]+"?,\s+line\s+(\d+))(?=[:\s]|$)/g,
    /(^|[^\w./-])(src\.[A-Za-z0-9]+\((\d+)\))(?=\s*[:\s]|$)/g,
];

type SourceLineMatch = {
    start: number;
    end: number;
    text: string;
    line: number;
};

function findSourceLineMatches(text: string): SourceLineMatch[] {
    const matches: SourceLineMatch[] = [];

    for (const pattern of SOURCE_LINE_LOCATION_PATTERNS) {
        for (const match of text.matchAll(pattern)) {
            const matchText = match[0];
            const prefix = match[1] ?? "";
            const locationText = match[2];
            const line = Number.parseInt(match[3], 10);

            if (!Number.isSafeInteger(line) || line < 1) {
                continue;
            }

            matches.push({
                start: match.index + prefix.length,
                end: match.index + matchText.length,
                text: locationText,
                line,
            });
        }
    }

    return matches.sort((a, b) => a.start - b.start);
}

export function parseCompilerMessages(
    text?: string | null,
): CompilerMessagePart[] {
    if (!text) {
        return [];
    }

    const locations: CompilerMessagePart[] = [];
    let index = 0;

    for (const match of findSourceLineMatches(text)) {
        if (match.start < index) {
            continue;
        }

        if (match.start > index) {
            locations.push({
                type: "text",
                text: text.slice(index, match.start),
            });
        }

        locations.push({
            type: "sourceLine",
            text: match.text,
            line: match.line,
        });

        index = match.end;
    }

    if (index < text.length) {
        locations.push({ type: "text", text: text.slice(index) });
    }

    return locations;
}
