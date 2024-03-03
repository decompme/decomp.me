import { ImageResponse } from "next/server"

import { PlatformIcon } from "@/components/PlatformSelect/PlatformIcon"
import { getScoreText } from "@/components/ScoreBadge"
import { get } from "@/lib/api/request"

import getScratchDetails from "./getScratchDetails"

export const runtime = "edge"

export default async function ScratchOG({ params }: { params: { slug: string}}) {

    const { scratch, parentScratch, compilation } = await getScratchDetails(params.slug)

    const score = getScoreText(compilation?.diff_output?.current_score ?? -1, compilation?.diff_output?.max_score ?? -1, scratch.match_override)
    const fork = parentScratch ? `${parentScratch.owner?.username ?? "?"}/${parentScratch.name}` : ""

    const compilers = await get("/compiler")
    const preset = compilers["platforms"][scratch.platform].presets.find(p => p.id === scratch.preset)

    return new ImageResponse(
        <div
            tw="flex flex-col justify-between w-full h-full bg-zinc-800 text-slate-200 text-5xl leading-normal"
            className="dark"
        >
            <div
                tw="flex ml-10 mt-10 mr-10"
            >
                <PlatformIcon
                    platform={scratch.platform}
                    size={96}
                />
                <div tw={"text-slate-50 ml-10"}>{preset?.name || "Custom Preset"}</div>
            </div>

            <div tw="h-4 bg-fuchsia-600">

            </div>

            <div
                tw="flex ml-10 mr-10 justify-between"
            >
                <div tw="">Function:</div>
                <div tw="text-slate-50 ml-10">{scratch.name}</div>
            </div>

            <div
                tw="flex ml-10 mr-10 justify-between"
            >
                <div tw="">Owner:</div>
                <div tw="text-slate-50 ml-10">{scratch.owner.username}</div>
            </div>

            <div
                tw="flex ml-10 mr-10 justify-between"
            >
                <div tw="">Score:</div>
                <div tw="text-slate-50 ml-10">{score}</div>
            </div>

            {fork && (
                <div
                    tw="flex ml-10 mr-10 mb-10 justify-between"
                >
                    <div tw="">Parent:</div>
                    <div tw="flex flex-col justify-center">
                        <div tw="flex "></div>
                        <div tw="flex text-slate-50 ml-10 text-3xl">{fork}</div>
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