import { useAiSettings } from "@/lib/settings";
import React, {
    createContext,
    useContext,
    useState,
    type ReactNode,
} from "react";
import { AiProvider as SettingsAiProvider } from "@/lib/settings";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createDeepSeek } from "@ai-sdk/deepseek";

function createProvider(provider: SettingsAiProvider, apiKey: string) {
    switch (provider) {
        case SettingsAiProvider.OPENAI:
            return createOpenAI({ apiKey, compatibility: "strict" });

        case SettingsAiProvider.DEEPSEEK:
            return createDeepSeek({ apiKey });

        default: {
            const exhaustiveCheck: never = provider;
            return null;
        }
    }
}

interface AiContextProps {
    canUseAi: boolean;
    chatHistory: Message[];
    newMessage: string;
    chatSubmit: (prompt: string) => void;
    setNewMessage: (message: string) => void;
}

const AiContext = createContext<AiContextProps>(null);

export type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
};

type Props = {
    children: ReactNode;
};

export function AiProvider({ children }: Props) {
    const { aiProvider, aiModel, aiApiKey } = useAiSettings();
    const [chatHistory, setChatHistory] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");

    const canUseAi = Boolean(aiApiKey);

    const provider = createProvider(aiProvider, aiApiKey);
    const model = provider?.(aiModel);

    const chatSubmit = async (prompt: string) => {
        setChatHistory([
            ...chatHistory,
            { id: `user-${chatHistory.length}`, role: "user", content: prompt },
            { id: `assistant-loading-${chatHistory.length}`, role: "assistant", content: "Loading..." },
        ]);

        const { text } = await generateText({
            model,
            messages: [...chatHistory, { role: "user", content: prompt }],
        });

        setChatHistory([
            ...chatHistory,
            { id: `user-${chatHistory.length}`, role: "user", content: prompt },
            { id: `assistant-response-${chatHistory.length}`, role: "assistant", content: text },
        ]);
    };

    return (
        <AiContext.Provider
            value={{
                canUseAi,
                chatHistory,
                newMessage,
                chatSubmit,
                setNewMessage,
            }}
        >
            {children}
        </AiContext.Provider>
    );
}

export function useAi() {
    const context = useContext(AiContext);
    if (!context) {
        throw new Error("useAi must be used within an AiProvider");
    }

    return context;
}
