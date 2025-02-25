import { ArrowUpIcon } from "@primer/octicons-react";
import { useAi } from "@/providers/AiProvider";
import GhostButton from "@/components/GhostButton";

export default function ChatInput() {
    const { newMessage, setNewMessage, chatSubmit } = useAi();

    return (
        <div className="relative h-[100px] p-2">
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
                className="w-full h-full p-[8px] pr-[40px] rounded bg-gray-6 border border-gray-8 !outline-none"
                spellCheck={false}
            />

            <GhostButton
                className="absolute right-[12px] bottom-[55%]"
                onClick={() => {
                    chatSubmit(newMessage);
                    setNewMessage("");
                }}
            >
                <ArrowUpIcon />
            </GhostButton>
        </div>
    );
}
