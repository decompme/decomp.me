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
                className="!outline-none h-full w-full rounded border border-gray-8 bg-gray-6 p-[8px] pr-[40px]"
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
