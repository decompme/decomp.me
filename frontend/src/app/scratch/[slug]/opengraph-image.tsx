import { ImageResponse } from "next/server"

import { PlatformIcon } from "@/components/PlatformSelect/PlatformIcon"
import { percentToString, calculateScorePercent } from "@/components/ScoreBadge"
import { get } from "@/lib/api/request"

import CheckCircleFillIcon from "./assets/check-circle-fill.svg"
import PurpleFrog from "./assets/purplefrog.svg"
import RepoForkedIcon from "./assets/repo-forked.svg"
import TrophyIcon from "./assets/trophy.svg"
import XCircleFillIcon from "./assets/x-circle-fill.svg"
import getScratchDetails from "./getScratchDetails"

export const runtime = "edge"

export default async function ScratchOG({ params }: { params: { slug: string }}) {

    const { scratch, parentScratch, compilation } = await getScratchDetails(params.slug)

    const compilers = await get("/compiler")
    const preset = compilers["platforms"][scratch.platform].presets.find(p => p.id === scratch.preset)

    const scratchNameSize = scratch.name.length > 20 ? "text-6xl" : "text-7xl"

    const score = compilation?.diff_output?.current_score ?? -1
    const maxScore = compilation?.diff_output?.max_score ?? -1

    scratch.match_override = true

    return new ImageResponse(
        <div
            tw="flex flex-col justify-between w-full h-full bg-zinc-800 text-slate-50"
            className="dark"
        >
            <div tw="flex ml-20 mr-20 mt-5 flex-row justify-between">
                <div tw="flex flex-col justify-center">
                    <div tw="flex text-5xl text-slate-300">{scratch.owner.username}</div>
                    <div tw={`flex ${scratchNameSize}`}>{scratch.name}</div>
                </div>
                <div tw="flex bg-zinc-700 rounded-2xl">
                    <div tw="flex m-3">
                        <PlatformIcon
                            platform={scratch.platform}
                            size={128}
                        />
                    </div>
                </div>
            </div>

            <div tw="flex ml-20 mr-20 text-4xl text-slate-300">{preset?.name || "Custom Preset"}</div>

            <div tw="flex ml-20 mr-20 justify-between">
                <div tw="flex">

                    {score === -1
                        ?
                        <div tw="flex flex-row">
                            <div tw="flex flex-col justify-around">
                                <XCircleFillIcon width={40} height={40} />
                            </div>
                            <div tw="flex flex-col ml-4">
                                <div tw="flex text-4xl">No</div>
                                <div tw="flex text-4xl">Score</div>
                            </div>
                        </div>
                        : score === 0
                            ?
                            <div tw="flex flex-row">
                                <div tw="flex flex-col justify-around">
                                    <CheckCircleFillIcon width={48} height={48}/>
                                </div>
                                <div tw="flex flex-col ml-4 justify-around">
                                    <div tw="flex text-4xl">Matched</div>
                                    {scratch.match_override &&
                                        <div tw="flex text-3xl text-slate-300">(Override)</div>
                                    }
                                </div>
                            </div>
                            :
                            <div tw="flex flex-row">
                                <div tw="flex flex-col justify-around">
                                    <TrophyIcon width={40} height={40} />
                                </div>
                                <div tw="flex flex-col justify-around ml-4">
                                    <div tw="flex text-3xl text-slate-300">{score}</div>
                                    <div tw="flex text-4xl">{percentToString(calculateScorePercent(score, maxScore))}</div>
                                </div>
                            </div>
                    }

                    {parentScratch &&
                    <div tw="flex flex-row ml-5">
                        <div tw="flex flex-col justify-around">
                            <RepoForkedIcon width={40} height={40} />
                        </div>
                        <div tw="flex flex-col ml-4 mt-1">
                            <div tw="flex text-3xl text-slate-300">{parentScratch.owner?.username ?? "?"}</div>
                            <div tw="flex text-4xl">{parentScratch.name}</div>
                        </div>
                    </div>
                    }

                </div>
                <div tw="flex flex-col justify-around">
                    <PurpleFrog width={64} height={64} />
                </div>

            </div>
            <div tw="flex h-4 bg-purple-500"></div>

        </div>,
        {
            width: 1200,
            height: 400,
        },
    )
}