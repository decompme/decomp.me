import type { TerseScratch } from "@/lib/api/types";
import Chat from "@/components/Chat/Chat";
import { useState } from "react";
import Button from "@/components/Button";
import PromptBuilder from "@/components/PromptBuilder/PromptBuilder";

type Tab = "chat" | "promptBuilder";

type Props = {
    scratch: TerseScratch;
};

export default function AiPanel({ scratch }: Props) {
    const [tab, setTab] = useState<Tab>("promptBuilder");

    return (
        <div className="h-full flex flex-col overflow-scroll">
            <div className="flex justify-center gap-2 p-4">
                <Button onClick={() => setTab("promptBuilder")}>
                    Prompt Builder
                </Button>
                <Button onClick={() => setTab("chat")}>Chat</Button>
            </div>

            <div className="grow">
                {tab === "chat" ? (
                    <Chat />
                ) : (
                    <div className="pr-4 pl-4 pb-4">
                        <PromptBuilder
                            scratch={scratch}
                            goToChatTab={() => setTab("chat")}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
