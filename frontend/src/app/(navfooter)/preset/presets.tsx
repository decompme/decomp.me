"use client";

import { useState } from "react";

import PlatformSelect from "@/components/PlatformSelect";
import { PresetList } from "@/components/PresetList";
import type * as api from "@/lib/api";

export function Presets({
    serverCompilers,
}: {
    serverCompilers: {
        platforms: {
            [id: string]: api.Platform;
        };
        compilers: {
            [id: string]: api.Compiler;
        };
    };
}) {
    const platforms = Object.keys(serverCompilers.platforms);

    const [platform, setPlatform] = useState<string>(
        platforms.length > 0 ? platforms[0] : "",
    );

    return (
        <section>
            <h2 className="pb-2 font-medium text-lg tracking-tight">
                Platforms
            </h2>
            <PlatformSelect
                platforms={serverCompilers.platforms}
                value={platform}
                onChange={setPlatform}
            />
            <h2 className="py-2 font-medium text-lg tracking-tight">Presets</h2>
            <PresetList url={`/preset?platform=${platform}`} />
        </section>
    );
}
