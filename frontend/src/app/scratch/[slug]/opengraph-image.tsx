import { ImageResponse } from "next/server"

import { getScoreText } from "@/components/ScoreBadge"
import { PlatformIcon } from "@/components/PlatformSelect/PlatformIcon"

import getScratchDetails from "./getScratchDetails"

export const runtime = "edge"

export default async function ScratchOG({ params }: { params: { slug: string}}) {

    const { scratch, parentScratch, compilation } = await getScratchDetails(params.slug)

    const score = getScoreText(compilation?.diff_output?.current_score ?? -1, compilation?.diff_output?.max_score ?? -1, scratch.match_override)
    const fork = parentScratch ? `${parentScratch.owner?.username ?? "?"}/${parentScratch.name}` : ""

    // this is really rubbish, need to either align the text at the botom,
    // or in the middle without resorting to padding...
    const getTextSize = (text) => {
        if (!text)
        return ""

        if (text.length < 10) {
            return "text-7xl"
        } else if (text.length < 20) {
            return "text-6xl pt-4"
        } else if (text.length < 40) {
            return "text-5xl pt-8"
        } else {
            return "text-4xl pt-9"
        }
    }

    // FIXME: fetch preset from API based on scratch.preset
    const presetName = "Dummy Preset"

    return new ImageResponse(
        (
        <div
            tw="flex flex-col w-full h-full bg-neutral-800 text-slate-200 text-7xl leading-tight"
            >
            <div
                tw="flex ml-10 mt-10 mb-10"
                >
                <PlatformIcon
                platform={scratch.platform}
                size={96}
                />
                <div tw={`text-slate-50 ml-10 ${getTextSize(scratch.name)}`}>{scratch.name}</div>
            </div>

            <div
            tw="flex ml-10 mr-10 justify-between "
            >
            <div tw="">Preset:</div>
            <div tw={`text-slate-50 ml-10 ${getTextSize(presetName)}`}>{presetName}</div>
            </div>

            <div
            tw="flex ml-10 mr-10 justify-between "
            >
            <div tw="">Owner:</div>
            <div tw={`text-slate-50 ml-10 ${getTextSize(scratch.owner.username)}`}>{scratch.owner.username}</div>
            </div>

            <div
            tw="flex ml-10 mr-10 justify-between"
            >
            <div tw="">Score:</div>
            <div tw="text-slate-50 ml-10">{score}</div>
            </div>

            {fork && (
                <div
                tw="flex ml-10 mr-10 justify-between"
                >
                <div tw="">Parent:</div>
                <div tw={`text-slate-50 ml-10 ${getTextSize(fork)}`}>{fork}</div>
                </div>
            )}
        </div>
        ),
        {
            width: 1200,
            height: fork ? 630 : 510,
        },
    );
}