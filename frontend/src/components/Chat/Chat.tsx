import { useEffect, useRef, useState } from "react";
import { ArrowUpIcon } from "@primer/octicons-react";
import { useAI } from "@/lib/ai/ai";
import ChatMessage from "@/components/Chat/ChatMessage";
import GhostButton from "@/components/GhostButton";

export default function Chat() {
    const { chatHistory, chatSubmit } = useAI();
    const [newMessage, setNewMessage] = useState("");
    const chatHistoryRef = useRef<HTMLDivElement>();

    useEffect(() => {
        if (!chatHistoryRef.current) {
            return;
        }

        chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }, [chatHistory.length]);

    useEffect(() => {
        const runInitialPrompt = async () => {
            if (
                localStorage.new_scratch_use_ai_enabled &&
                localStorage.new_scratch_quickstart_prompt
            ) {
                await chatSubmit(localStorage.new_scratch_quickstart_prompt);

                delete localStorage.new_scratch_use_ai_enabled;
                delete localStorage.new_scratch_quickstart_prompt;
            }
        };

        runInitialPrompt();
    }, []);

    return (
        <div className="flex h-[100%] flex-col gap-2">
            <div
                ref={chatHistoryRef}
                className="h-[calc(100%-100px)] overflow-scroll"
            >
                {chatHistory.map((message, i) => (
                    <div key={i}>
                        <ChatMessage
                            role={message.role}
                            text={message.content}
                        />
                    </div>
                ))}
            </div>

            <div className="relative h-[100px]">
                <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            chatSubmit(newMessage);
                            setNewMessage("");
                        }
                    }}
                    className="w-full resize-none p-[8px] pr-[20px]"
                    spellCheck={false}
                />

                <GhostButton
                    className="absolute right-[10px] bottom-[55%]"
                    onClick={() => {
                        chatSubmit(newMessage);
                        setNewMessage("");
                    }}
                >
                    <ArrowUpIcon />
                </GhostButton>
            </div>
        </div>
    );
}
