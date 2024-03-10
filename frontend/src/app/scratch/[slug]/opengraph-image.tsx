import { ImageResponse } from "next/server"

import { PlatformIcon } from "@/components/PlatformSelect/PlatformIcon"
import { percentToString, calculateScorePercent } from "@/components/ScoreBadge"
import { get } from "@/lib/api/request"
import { Preset } from "@/lib/api/types"

import CheckCircleFillIcon from "./assets/check-circle-fill.svg"
import PurpleFrog from "./assets/purplefrog.svg"
import RepoForkedIcon from "./assets/repo-forked.svg"
import TrophyIcon from "./assets/trophy.svg"
import XCircleFillIcon from "./assets/x-circle-fill.svg"
import getScratchDetails from "./getScratchDetails"

const truncateText = (text: string, length: number) => text.slice(0, length) + "..." + text.slice(-length, text.length)

const IMAGE_WIDTH_PX = 1200
const IMAGE_HEIGHT_PX = 400

export const runtime = "edge"

export default async function ScratchOG({ params }: { params: { slug: string }}) {

    const { scratch, parentScratch, compilation } = await getScratchDetails(params.slug)

    const preset: Preset | null = scratch.preset !== null ? await get(`/preset/${scratch.preset}`) : null

    const scratchName = scratch.name.length > 40 ? truncateText(scratch.name, 18) : scratch.name
    const scratchNameSize =
        scratchName.length > 32 ? "4xl" :
            scratchName.length > 24 ? "5xl" : "6xl"

    const score = compilation?.diff_output?.current_score ?? -1
    const maxScore = compilation?.diff_output?.max_score ?? -1

    const percent = scratch.match_override ? 100 : calculateScorePercent(score, maxScore)
    const doneWidth = Math.floor(percent * IMAGE_WIDTH_PX / 100)
    const todoWidth = IMAGE_WIDTH_PX - doneWidth

    return new ImageResponse(
        <div tw="flex flex-col justify-between w-full h-full bg-zinc-800 text-slate-50 text-5xl">
            <div tw="flex flex-col">
                <div tw="flex flex-row justify-between ml-15 mr-15 mt-5">
                    <div tw="flex flex-col justify-center">
                        <div tw="flex text-slate-300">{scratch.owner?.username ?? "No Owner"}</div>
                        <div tw={`flex text-${scratchNameSize}`}>{scratchName}</div>
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
                <div tw="flex mt-3 ml-15 mr-15 text-slate-300">{preset?.name || "Custom Preset"}</div>
            </div>

            <div tw="flex justify-between mt-5 ml-15 mr-15">
                <div tw="flex">
                    {score === -1
                        ?
                        <div tw="flex">
                            <div tw="flex flex-col justify-around">
                                <XCircleFillIcon width={48} height={48} />
                            </div>
                            <div tw="flex flex-col justify-around ml-5">
                                <div tw="flex">No Score</div>
                            </div>
                        </div>
                        : score === 0 || scratch.match_override
                            ?
                            <div tw="flex">
                                <div tw="flex flex-col justify-around">
                                    <CheckCircleFillIcon width={48} height={48} />
                                </div>
                                <div tw="flex flex-col items-center ml-5">
                                    <div tw="flex">Matched</div>
                                    {scratch.match_override &&
                                        <div tw="flex text-4xl text-slate-300">(Override)</div>
                                    }
                                </div>
                            </div>
                            :
                            <div tw="flex">
                                <div tw="flex flex-col justify-around">
                                    <TrophyIcon width={48} height={48} />
                                </div>
                                <div tw="flex flex-col justify-around ml-5">
                                    <div tw="flex">
                                        {score} ({percentToString(percent)})
                                    </div>
                                </div>
                            </div>
                    }

                    {parentScratch &&
                    <div tw="flex ml-10">
                        <div tw="flex flex-col justify-around">
                            <RepoForkedIcon width={48} height={48} />
                        </div>
                        <div tw="flex flex-col justify-around ml-5">
                            {parentScratch.owner?.username ?? "Anonymous User"}
                        </div>
                    </div>
                    }
                </div>

                <div tw="flex flex-col justify-around ml-15">
                    <PurpleFrog width={64} height={64} />
                </div>
            </div>

            <div tw="flex">
                <div tw={`flex h-4 bg-purple-500 w-[${doneWidth}px]`}></div>
                <div tw={`flex h-4 bg-purple-900 w-[${todoWidth}px]`}></div>
            </div>
        </div>,
        {
            width: IMAGE_WIDTH_PX,
            height: IMAGE_HEIGHT_PX,
        },
    )
}
