"use client";

import { useState } from "react";

import PlatformSelect from "@/components/PlatformSelect";
import { PresetList } from "@/components/PresetList";
import type * as api from "@/lib/api";

export function Presets({
    availablePlatforms,
}: {
    availablePlatforms: {
        [id: string]: api.PlatformBase;
    };
}) {
    const [platform, setPlatform] = useState<string>(
        Object.keys(availablePlatforms).length > 0
            ? Object.keys(availablePlatforms)[0]
            : "",
    );

    return (
        <section>
            <h2 className="pb-2 font-medium text-lg tracking-tight">
                Platforms
            </h2>
            <PlatformSelect
                platforms={availablePlatforms}
                value={platform}
                onChange={setPlatform}
            />
            <div className="pb-1" />
            <PresetList
                title={"Presets"}
                url={`/preset?platform=${platform}`}
            />
        </section>
    );
}
