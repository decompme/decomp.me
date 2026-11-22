"use client";

import { useEffect } from "react";

const MIN_BLINK_INTERVAL = 60_000;
const MAX_BLINK_INTERVAL = 180_000;
const WINK_DURATION = 300;
const GESTURES = [
    "/purplefrog-wink-left.svg",
    "/purplefrog-wink-right.svg",
    "/purplefrog-blink.svg",
];

export default function FaviconBlinker(): null {
    useEffect(() => {
        const favicon = document.getElementById(
            "favicon",
        ) as HTMLLinkElement | null;
        if (!favicon) return;

        let timeoutId: ReturnType<typeof setTimeout>;
        const scheduleBlink = () => {
            const delay =
                MIN_BLINK_INTERVAL +
                Math.random() * (MAX_BLINK_INTERVAL - MIN_BLINK_INTERVAL);

            timeoutId = setTimeout(() => {
                const gestureIndex = Math.floor(
                    Math.random() * GESTURES.length,
                );
                favicon.href = GESTURES[gestureIndex];
                timeoutId = setTimeout(() => {
                    favicon.href = "/purplefrog.svg";
                    scheduleBlink();
                }, WINK_DURATION);
            }, delay);
        };

        scheduleBlink();

        return () => {
            clearTimeout(timeoutId);
            favicon.href = "/purplefrog.svg";
        };
    }, []);

    return null;
}
