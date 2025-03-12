import { ReactNode } from "react";
import classNames from "classnames";
import UserAvatar from "../user/UserAvatar";
import { useThisUser } from "@/lib/api";
import Frog from "@/components/Nav/frog.svg";

type Props = {
    role: "user" | "assistant";
    text: string;
};

export default function ChatMessage({ role, text }: Props) {
    const user = useThisUser();

    const avatar =
        role === "user" ? (
            <UserAvatar user={user} />
        ) : (
            <Frog className="size-4" aria-label="Purple frog" />
        );

    return (
        <div
            className={classNames("mb-2 rounded bg-gray-4 p-2 text-gray-11", {
                "ml-[5%]": role === "user",
                "mr-[5%]": role === "assistant",
            })}
        >
            <div className="mb-2 flex items-center">
                {avatar}

                <span className="ml-2 font-semibold">
                    {role === "user" ? user.username : "AI"}
                </span>

                <button
                    className="ml-auto"
                    onClick={() => {
                        const cleanText =
                            /^```\w+?\n([\s\S]*)```$/.exec(text)?.[1] ?? text;

                        navigator.clipboard.writeText(cleanText);
                    }}
                >
                    Copy
                </button>
            </div>

            <p style={{ whiteSpace: "pre-wrap" }}>{text}</p>
        </div>
    );
}
