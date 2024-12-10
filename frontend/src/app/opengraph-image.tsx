import { ImageResponse } from "next/og";

import {
    platformIcon,
    PLATFORMS,
} from "@/components/PlatformSelect/PlatformIcon";

const IMAGE_WIDTH_PX = 1200;

const IMAGE_HEIGHT_PX = 400;

export const runtime = "edge";

export default async function HomeOG() {
    const OpenSansExtraBold = fetch(
        new URL("/public/fonts/OpenSans-ExtraBold.ttf", import.meta.url),
    ).then((res) => res.arrayBuffer());

    const OpenSansSemiBold = fetch(
        new URL("/public/fonts/OpenSans-SemiBold.ttf", import.meta.url),
    ).then((res) => res.arrayBuffer());

    const OpenSansBold = fetch(
        new URL("/public/fonts/OpenSans-Bold.ttf", import.meta.url),
    ).then((res) => res.arrayBuffer());

    const statsRes = await fetch("http://decomp.me/api/stats");
    const stats = await statsRes.json();
    const iconSize = 160;
    const iconCount = 5;
    const textScale = 4.15;
    const textSize = {
        title: textScale,
        description: 0.6 * textScale,
        stats: 0.45 * textScale,
    };
    return new ImageResponse(
        <div tw="flex flex-col w-full h-full bg-zinc-900 text-slate-50 items-center justify-center">
            <div tw="absolute flex flex-row items-center h-full opacity-25">
                {PLATFORMS.map((platform) => ({
                    platform,
                    sort: Math.random(),
                }))
                    .sort((a, b) => a.sort - b.sort)
                    .slice(0, iconCount)
                    .map(({ platform }) => {
                        const Icon = platformIcon(platform);
                        return (
                            <Icon
                                key={platform}
                                width={iconSize}
                                height={iconSize}
                                tw="m-10"
                            />
                        );
                    })}
            </div>
            <div tw="w-full h-1/10" />
            <div
                tw={`flex w-full justify-center text-[${textSize.title}rem]`}
                style={{ fontFamily: "OpenSans-ExtraBold" }}
            >
                decomp.me
            </div>
            <span
                tw={`flex flex-wrap justify-center text-[${textSize.description}rem] text-center w-3/4`}
                style={{ fontFamily: "OpenSans-Bold" }}
            >
                Collaboratively decompile code in your browser
            </span>
            <div tw="w-full h-1/8" />
            <div
                tw={`flex justify-between w-full text-[${textSize.stats}rem]`}
                style={{ fontFamily: "OpenSans-SemiBold" }}
            >
                <a tw="ml-10">
                    {stats.scratch_count.toLocaleString()} scratches
                </a>
                <a>{stats.profile_count.toLocaleString()} visitors</a>
                <a>{stats.github_user_count.toLocaleString()} users</a>
                <a tw="mr-10">{stats.asm_count.toLocaleString()} asm globs</a>
            </div>
        </div>,
        {
            width: IMAGE_WIDTH_PX,
            height: IMAGE_HEIGHT_PX,
            fonts: [
                {
                    name: "OpenSans-ExtraBold",
                    data: await OpenSansExtraBold,
                },
                {
                    name: "OpenSans-SemiBold",
                    data: await OpenSansSemiBold,
                },
                {
                    name: "OpenSans-Bold",
                    data: await OpenSansBold,
                },
            ],
        },
    );
}
