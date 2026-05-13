"use client";

import { useMemo } from "react";

import { useRouter as useNextRouter } from "next/navigation";

import { confirmNavigation } from "./hooks";

type Router = ReturnType<typeof useNextRouter>;

export function useRouter(): Router {
    const router = useNextRouter();

    return useMemo<Router>(
        () => ({
            ...router,
            push: (...args: Parameters<Router["push"]>) => {
                if (confirmNavigation()) router.push(...args);
            },
            replace: (...args: Parameters<Router["replace"]>) => {
                if (confirmNavigation()) router.replace(...args);
            },
            back: () => {
                if (confirmNavigation()) router.back();
            },
            forward: () => {
                if (confirmNavigation()) router.forward();
            },
            refresh: () => {
                if (confirmNavigation()) router.refresh();
            },
        }),
        [router],
    );
}
