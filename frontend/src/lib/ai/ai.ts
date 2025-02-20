import { useState } from "react";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { AiProvider, useAiSettings } from "@/lib/settings";

function createProvider(provider: AiProvider, apiKey: string) {
    switch (provider) {
        case AiProvider.OPENAI:
            return createOpenAI({ apiKey, compatibility: "strict" });

        case AiProvider.DEEPSEEK:
            return createDeepSeek({ apiKey });

        default: {
            const exhaustiveCheck: never = provider;
            throw new Error(`Unknown provider: ${exhaustiveCheck}`);
        }
    }
}

export type Message = {
    role: "user" | "assistant";
    content: string;
};

export function useAI() {
    const { aiProvider, aiModel, aiApiKey } = useAiSettings();
    const [chatHistory, setChatHistory] = useState<Message[]>([]);

    const provider = createProvider(aiProvider, aiApiKey);
    const model = provider(aiModel);

    const chatSubmit = async (prompt: string) => {
        setChatHistory([
            ...chatHistory,
            { role: "user", content: prompt },
            { role: "assistant", content: "Loading..." },
        ]);

        const { text } = await generateText({
            model,
            messages: [...chatHistory, { role: "user", content: prompt }],
        });

        setChatHistory([
            ...chatHistory,
            { role: "user", content: prompt },
            { role: "assistant", content: text },
        ]);
    };

    return { chatHistory, chatSubmit };
}
