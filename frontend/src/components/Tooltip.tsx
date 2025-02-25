import {
    Root,
    Trigger,
    Portal,
    Content,
    Arrow,
    TooltipProvider,
} from "@radix-ui/react-tooltip";
import type { ReactElement } from "react";

type Props = {
    children: ReactElement;
    message?: React.ReactNode;
    position?: "top" | "bottom" | "left" | "right";
};

function Tooltip({ message, children, position = "top" }: Props) {
    if (!message) {
        return children;
    }

    return (
        <TooltipProvider>
            <Root delayDuration={0}>
                <Trigger>{children}</Trigger>

                <Portal>
                    <Content
                        side={position}
                        className="z-[2000] rounded bg-gray-3 p-1.5"
                        sideOffset={5}
                    >
                        <div className="break-words">{message}</div>

                        <Arrow
                            width={12}
                            height={6}
                            style={{ fill: "rgb(43, 39, 44)" }}
                        />
                    </Content>
                </Portal>
            </Root>
        </TooltipProvider>
    );
}

export default Tooltip;
