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

    const score = -1 //compilation?.diff_output?.current_score ?? -1
    const maxScore = compilation?.diff_output?.max_score ?? -1

    return new ImageResponse(
        <div
            tw="flex flex-col justify-between w-full h-full bg-zinc-800 text-slate-50"
            className="dark"
        >
            <div tw="flex ml-20 mr-20 mt-20 flex-row justify-between">
                <div tw="flex flex-col justify-center">
                    <div tw="flex text-5xl text-slate-300">{scratch.owner.username}/</div>
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

                    {score === -1
                        ?
                        <div tw="flex flex-row">
                            <div tw="flex mt-1">
                                <XCircleFillIcon width={64} height={64} />
                            </div>
                            <div tw="flex ml-3 mt-2 text-5xl">
                                ERROR
                            </div>
                        </div>
                        : score === 0
                            ?
                            <div tw="flex flex-row">
                                <div tw="flex mt-1">
                                    <CheckCircleFillIcon width={64} height={64}/>
                                </div>
                                <div tw="flex text-5xl mt-2 ml-3">
                                    {scratch.match_override ? "OVERRIDE" : "MATCHED"}
                                </div>
                            </div>
                            :
                            <div tw="flex flex-row justify-around ">
                                <div tw="flex mt-2">
                                    <TrophyIcon width={64} height={64} />
                                </div>
                                <div tw="flex flex-col justify-around ml-4">
                                    <div tw="flex text-3xl">{score}</div>
                                    <div tw="flex text-3xl">{percentToString(calculateScorePercent(score, maxScore))}</div>

                                </div>
                            </div>
                    }

                    {parentScratch &&
                    <div tw="flex flex-row ml-5 ">
                        <div tw="flex mt-2">
                            <RepoForkedIcon width={64} height={64} />
                        </div>
                        <div tw="flex flex-col ml-4 mt-1">
                            <div tw="flex text-2xl">{parentScratch.owner?.username ?? "?"}/</div>
                            <div tw="flex text-2xl">{parentScratch.name}</div>
                        </div>
                    </div>
                    }

                </div>
                <div tw="flex flex-col justify-around ">
                    <div tw="flex text-4xl">
                        <PurpleFrog width={48} height={48} />
                        <div tw="flex ml-3">
                            decomp.me
                        </div>
                    </div>
                </div>

            </div>
            <div tw="flex h-6 bg-purple-500"></div>

        </div>,
        {
            // match GitHub dimensions
            width: 1152,
            height: 576,
        },
    )
}