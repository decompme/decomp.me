import { ImageResponse } from "next/server"

import { PlatformIcon } from "@/components/PlatformSelect/PlatformIcon"
import { getScoreText } from "@/components/ScoreBadge"
import { get } from "@/lib/api/request"

import getScratchDetails from "./getScratchDetails"

export const runtime = "edge"

export default async function ScratchOG({ params }: { params: { slug: string }}) {

    const { scratch, parentScratch, compilation } = await getScratchDetails(params.slug)

    const score = getScoreText(compilation?.diff_output?.current_score ?? -1, compilation?.diff_output?.max_score ?? -1, scratch.match_override)
    const fork = parentScratch ? `${parentScratch.owner?.username ?? "?"}/${parentScratch.name}` : ""

    const compilers = await get("/compiler")
    const preset = compilers["platforms"][scratch.platform].presets.find(p => p.id === scratch.preset)

    return new ImageResponse(
        <div
            tw="flex flex-col justify-between w-full h-full bg-zinc-800 text-slate-50 text-5xl"
            className="dark"
        >
            <div
                tw="flex ml-10 mt-10 mr-10"
            >
                <PlatformIcon
                    platform={scratch.platform}
                    size={120}
                />
                <div tw="flex flex-col justify-center">
                    <div tw="flex "></div>
                    <div tw="flex ml-10 ">{preset?.name || "Custom Preset"}</div>
                </div>
            </div>

            <div tw="h-2 bg-fuchsia-600"></div>

            <div
                tw="flex ml-10 mr-10"
            >
                <div tw="min-w-52">Function:</div>
                <div tw="ml-10">{scratch.name}</div>
            </div>

            <div
                tw="flex ml-10 mr-10"
            >
                <div tw="min-w-52">Owner:</div>
                <div tw="ml-10">{scratch.owner.username}</div>
            </div>

            <div
                tw="flex ml-10 mr-10"
            >
                <div tw="min-w-52">Score:</div>
                <div tw="ml-10">{score}</div>
            </div>

            {fork && (
                <div
                    tw="flex ml-10 mr-10 mb-10"
                >
                    <div tw="min-w-52">Parent:</div>
                    <div tw="flex flex-col justify-center">
                        <div tw="flex "></div>
                        <div tw="flex ml-10 text-4xl">{fork}</div>
                    </div>
                </div>
            )}
        </div>,
        {
            width: 1200,
            height: 630,
        },
    )
}