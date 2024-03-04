import { ImageResponse } from "next/server"

import { PlatformIcon } from "@/components/PlatformSelect/PlatformIcon"
import { getScoreText } from "@/components/ScoreBadge"
import { get } from "@/lib/api/request"

import getScratchDetails from "./getScratchDetails"

export const runtime = "edge"

export default async function ScratchOG({ params }: { params: { slug: string }}) {

    const { scratch, parentScratch, compilation } = await getScratchDetails(params.slug)

    const score = getScoreText(compilation?.diff_output?.current_score ?? -1, compilation?.diff_output?.max_score ?? -1, scratch.match_override)

    const compilers = await get("/compiler")
    const preset = compilers["platforms"][scratch.platform].presets.find(p => p.id === scratch.preset)

    // TODO: tune these
    const scratchOwnerSize = scratch.owner.username.length > 16 ? "text-6xl" : "text-7xl"
    const scratchNameSize = scratch.name.length > 20 ? "text-5xl" : "text-6xl"

    return new ImageResponse(
        <div
            tw="flex flex-col justify-between w-full h-full bg-zinc-800 text-slate-50"
            className="dark"
        >
            <div tw="flex ml-20 mr-20 mt-20 flow-row justify-between">
                <div tw="flex flex-col justify-center">
                    <div tw={`flex ${scratchOwnerSize}`}>{scratch.owner.username}/</div>
                    <div tw={`flex ${scratchNameSize}`}>{scratch.name}</div>
                </div>
                <div tw="flex bg-zinc-700 rounded-2xl">
                    <div tw="flex m-3">
                        <PlatformIcon
                            platform={scratch.platform}
                            size={160}
                        />
                    </div>
                </div>
            </div>

            <div tw="flex ml-20 mr-20 text-5xl text-slate-300">{preset?.name || "Custom Preset"}</div>

            <div tw="flex ml-20 mr-20 justify-between">
                <div tw="flex">

                    <div tw="flex flex-row">
                        <div tw="flex text-6xl">🎯</div>
                        <div tw="flex flex-col justify-around ml-2">
                            <div tw="flex text-3xl">{score}</div>
                        </div>
                    </div>

                    {parentScratch &&
                    <div tw="flex flex-row ml-5 ">
                        <div tw="flex text-6xl">⚡</div>
                        <div tw="flex flex-col ml-2">
                            <div tw="flex text-2xl">{parentScratch.owner?.username ?? "?"}/</div>
                            <div tw="flex text-2xl">{parentScratch.name}</div>
                        </div>
                    </div>
                    }

                </div>
                <div tw="flex flex-col justify-around">
                    <div tw="flex text-4xl">
                        🐸 decomp.me
                    </div>
                </div>

            </div>
            <div tw="flex h-6 bg-fuchsia-600"></div>

        </div>,
        {
            // match GitHub dimensions
            width: 1152,
            height: 576,
        },
    )
}