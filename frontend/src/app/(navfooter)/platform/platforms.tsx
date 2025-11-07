"use client";

import { useRouter } from "next/navigation";

import PlatformSelect from "@/components/PlatformSelect";
import type * as api from "@/lib/api";

export function Platforms({
    availablePlatforms,
}: {
    availablePlatforms: {
        [id: string]: api.PlatformBase;
    };
}) {
    const router = useRouter();

    return (
        <section>
            <h2 className="pb-2 font-medium text-lg">Platforms</h2>
            <p className="p-2">
                Pick a platform below to explore its recently created Scratches.
            </p>
            <PlatformSelect
                platforms={availablePlatforms}
                value={null}
                onChange={(p) => {
                    router.push(`/platform/${p}`);
                }}
            />
        </section>
    );
}
