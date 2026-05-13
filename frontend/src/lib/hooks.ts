"use client";

import {
    useState,
    useRef,
    useLayoutEffect,
    useEffect,
    type RefObject,
} from "react";

import useResizeObserver from "@react-hook/resize-observer";

import { joinTitles } from "./title";

const shouldIgnoreNextWarnBeforeUnload = { current: false }; // ref
const navigationWarning = {
    enabled: false,
    message: "Are you sure you want to leave this page?",
};
const historyGuardKey = "__decompMeNavigationGuard";

export function useSize<T extends HTMLElement>(): {
    width: number | undefined;
    height: number | undefined;
    ref: RefObject<T>;
} {
    const ref = useRef<T>(null);
    const [size, setSize] = useState({ width: undefined, height: undefined });

    useLayoutEffect(() => {
        if (ref.current) setSize(ref.current.getBoundingClientRect());
    }, [ref]);

    useResizeObserver(ref, (entry) => setSize(entry.contentRect));

    return { width: size.width, height: size.height, ref };
}

export function ignoreNextWarnBeforeUnload() {
    shouldIgnoreNextWarnBeforeUnload.current = true;
}

export function confirmNavigation() {
    if (!navigationWarning.enabled) return true;

    if (shouldIgnoreNextWarnBeforeUnload.current) {
        shouldIgnoreNextWarnBeforeUnload.current = false;
        return true;
    }

    return confirm(navigationWarning.message);
}

export function useWarnBeforeUnload(
    enabled: boolean,
    message = "Are you sure you want to leave this page?",
) {
    const enabledRef = useRef(enabled);
    const messageRef = useRef(message);

    enabledRef.current = enabled;
    messageRef.current = message;

    useEffect(() => {
        navigationWarning.enabled = enabledRef.current;
        navigationWarning.message = messageRef.current;
        let shouldLeaveAfterPop = false;
        let isRemovingHistoryGuard = false;

        const armHistoryGuard = () => {
            if (
                !enabledRef.current ||
                window.history.state?.[historyGuardKey]
            ) {
                return;
            }

            // Add a same-URL sentinel so browser Back hits our popstate handler
            // before leaving the dirty scratch page.
            window.history.pushState(
                {
                    ...(window.history.state ?? {}),
                    [historyGuardKey]: true,
                },
                "",
                window.location.href,
            );
        };

        armHistoryGuard();

        const onClick = (event: MouseEvent) => {
            if (
                event.defaultPrevented ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                event.button !== 0
            ) {
                return;
            }

            const target = event.target;
            if (!(target instanceof Element)) return;

            const anchor = target.closest<HTMLAnchorElement>("a[href]");
            const linkTarget = anchor?.getAttribute("target");
            if (
                !anchor ||
                (linkTarget && linkTarget.toLowerCase() !== "_self") ||
                anchor.hasAttribute("download")
            ) {
                return;
            }

            const href = new URL(anchor.href, window.location.href);
            if (href.href === window.location.href) return;
            if (
                href.origin === window.location.origin &&
                href.pathname === window.location.pathname &&
                href.search === window.location.search
            ) {
                return;
            }

            if (!confirmNavigation()) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        };

        const onPopState = () => {
            if (isRemovingHistoryGuard) {
                isRemovingHistoryGuard = false;
                return;
            }

            if (shouldLeaveAfterPop) {
                shouldLeaveAfterPop = false;
                return;
            }

            if (!enabledRef.current) {
                return;
            }

            if (confirmNavigation()) {
                shouldLeaveAfterPop = true;
                window.history.back();
                return;
            }

            armHistoryGuard();
        };

        const onUnload = (event: BeforeUnloadEvent) => {
            if (enabledRef.current) {
                if (shouldIgnoreNextWarnBeforeUnload.current) {
                    shouldIgnoreNextWarnBeforeUnload.current = false;
                    return;
                }

                event.preventDefault();
                event.returnValue = messageRef.current;
                return event.returnValue;
            }
        };

        document.addEventListener("click", onClick, { capture: true });
        window.addEventListener("popstate", onPopState, { capture: true });
        window.addEventListener("beforeunload", onUnload, { capture: true });

        return () => {
            navigationWarning.enabled = false;
            if (window.history.state?.[historyGuardKey]) {
                isRemovingHistoryGuard = true;
                window.history.back();
            }
            document.removeEventListener("click", onClick, { capture: true });
            window.removeEventListener("popstate", onPopState, {
                capture: true,
            });
            window.removeEventListener("beforeunload", onUnload, {
                capture: true,
            });
        };
    }, [enabled, enabledRef, message, messageRef]);
}

export function usePageTitle(...breadcrumbs: string[]) {
    const title = joinTitles(...breadcrumbs);

    useEffect(() => {
        document.title = title;
    }, [title]);
}

export function useIsMounted() {
    const [isMounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        return () => {
            setMounted(false);
        };
    }, []);

    return isMounted;
}

export function useMediaQuery(query: string) {
    const [matches, setMatches] = useState(undefined);

    useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) setMatches(media.matches);

        const listener = () => setMatches(media.matches);
        media.addEventListener("change", listener);
        return () => media.removeEventListener("change", listener);
    }, [matches, query]);

    return matches;
}
