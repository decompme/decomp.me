import { useEffect, useRef } from "react";
import { useAi } from "@/providers/AiProvider";
import ChatMessage from "@/components/Chat/ChatMessage";
import Link from "next/link";
import ChatInput from "./ChatInput";

function ChatEmptyState() {
    return (
        <div className="flex h-full flex-col items-center justify-center">
            <p className="w-[75%]">
                Start a conversation with the AI by typing a message in the
                input box below. Check the prompt builder for some ideas on what
                to say.
            </p>
        </div>
    );
}

export default function Chat() {
    const { canUseAi, chatHistory } = useAi();
    const chatHistoryRef = useRef<HTMLDivElement>();

    useEffect(() => {
        if (!chatHistoryRef.current) {
            return;
        }

        chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }, [chatHistory.length]);

    if (!canUseAi) {
        return (
            <div className="h-full overflow-auto p-4">
                <p>
                    No AI API key defined in settings.{" "}
                    <Link href="/settings/ai" className="underline">
                        Go to the AI settings
                    </Link>{" "}
                    and set an API key to use the built-in chat.
                </p>
            </div>
        );
    }

    return (
        <div className="h-full">
            {chatHistory.length === 0 && <ChatEmptyState />}

            <div ref={chatHistoryRef} className="h-auto">
                {chatHistory.map((message, i) => (
                    <div key={i}>
                        <ChatMessage
                            role={message.role}
                            text={message.content}
                        />
                    </div>
                ))}
            </div>

            <div className="sticky bottom-0">
                <ChatInput />
            </div>
        </div>
    );
}
