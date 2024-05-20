"use client"

import React, { useState } from "react"

import PlatformSelect from "@/components/PlatformSelect"
import { PresetList } from "@/components/PresetList"
import * as api from "@/lib/api"
import { get } from "@/lib/api/request"

export default async function Page() {
    const compilers = await get("/compiler")

    return (
        <main className="mx-auto w-full max-w-3xl p-4">
            <Presets serverCompilers={compilers}/>
        </main>
    )
}

function Presets({ serverCompilers }: {
    serverCompilers: {
        platforms: {
            [id: string]: api.Platform
        }
        compilers: {
            [id: string]: api.Compiler
        }
    }
}): React.JSX.Element {

    const platforms = Object.keys(serverCompilers.platforms)

    const [platform, setPlatform] = useState<string>(platforms.length > 0?platforms[0]:"")

    return (
        <section>
            <div>
                <h2 className="pb-2 text-lg font-medium tracking-tight">Platforms</h2>
                <PlatformSelect
                    platforms={serverCompilers.platforms}
                    value={platform}
                    onChange={p => {
                        setPlatform(p)
                    }}
                />
            </div>
            <h2 className="py-2 text-lg font-medium tracking-tight">Presets</h2>
            <PresetList url={`/preset?platform=${platform}`}/>
        </section>
    )
}
