import type { Metadata } from "next";

import { getPublic } from "@/lib/api/request";
import type { PlatformBase } from "@/lib/api/types";

import BestScratches from "./BestScratches";
import {
    apiFractionToPercentString,
    parseDepthParam,
    parseOrderingParam,
    parsePlatformParam,
    parsePresetParam,
    parseSearchParam,
} from "./BestScratches.state";

export const metadata: Metadata = {
    title: "Best scratches by function",
};

export const dynamic = "force-dynamic";

export default async function Page(props: {
    searchParams: Promise<{
        platform?: string;
        preset?: string;
        depth?: string;
        ordering?: string;
        min_match?: string;
        search?: string;
    }>;
}) {
    const searchParams = await props.searchParams;
    const availablePlatforms: Record<string, PlatformBase> =
        await getPublic("/platform");

    const initialPlatform = parsePlatformParam(
        availablePlatforms,
        searchParams.platform,
    );
    const initialPreset = parsePresetParam(searchParams.preset);
    const initialDepth = parseDepthParam(searchParams.depth);
    const initialOrdering = parseOrderingParam(searchParams.ordering);
    const initialMinMatch = apiFractionToPercentString(searchParams.min_match);
    const initialSearch = parseSearchParam(searchParams.search);

    return (
        <main className="mx-auto w-full max-w-3xl p-4">
            <h1 className="font-semibold text-2xl text-gray-12 tracking-tight md:text-3xl">
                Best scratches by function name
            </h1>
            <BestScratches
                availablePlatforms={availablePlatforms}
                initialPlatform={initialPlatform}
                initialPreset={initialPreset}
                initialDepth={initialDepth}
                initialOrdering={initialOrdering}
                initialMinMatch={initialMinMatch}
                initialSearch={initialSearch}
            />
        </main>
    );
}
