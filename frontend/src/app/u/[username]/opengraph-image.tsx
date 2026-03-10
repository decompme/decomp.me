import { ImageResponse } from "next/og";

import { get } from "@/lib/api/request";
import { userAvatarUrl } from "@/lib/api/urls";

import PurpleFrog from "../../scratch/[slug]/assets/purplefrog.svg";
import type { ScratchUser } from "@/lib/api";
import { PlatformIcon } from "@/components/PlatformSelect/PlatformIcon";

const IMAGE_WIDTH_PX = 1200;
const IMAGE_HEIGHT_PX = 400;

export const runtime = "edge";
export const contentType = "image/png";

type Result = {
    group: string;
    count: number;
};
type Stats = {
    groupby: string;
    results: Result[];
};

const MAX_CATEGORIES = 4;

function getUsernameDisplay(username: string) {
    const len = username.length;

    if (len <= 8) return { size: "text-7xl", name: username };
    if (len <= 10) return { size: "text-6xl", name: username };
    if (len <= 14) return { size: "text-5xl", name: username };
    if (len <= 18) return { size: "text-4xl", name: username };

    return { size: "text-3xl", name: `${username.slice(0, 18)}...` };
}

function UserNotFound(username: string) {
    return new ImageResponse(
        <div tw="flex w-full h-full bg-zinc-800 text-slate-50 text-5xl items-center justify-center">
            User {username} not found.
        </div>,
    );
}

function ChartRow({
    group,
    count,
    total,
    length,
    chartWidth = "w-[62%]",
}: Result & { total: number; length: number; chartWidth?: string }) {
    const width = Math.max(1, Math.floor((count / total) * 100));
    const rowHeight = Math.min(50, Math.floor(0.8 * (100 / length)));
    return (
        <div tw={`flex flex-row items-center h-[${rowHeight}%]`}>
            <PlatformIcon platform={group} size={48} />
            <div tw={`flex ${chartWidth} h-full mx-5 bg-purple-900`}>
                <div tw={`bg-purple-500 w-[${width}%]`} />
            </div>

            <div tw="flex text-3xl">{count.toLocaleString("en-US")}</div>
        </div>
    );
}

export default async function UserOG({
    params,
}: { params: { username: string } }) {
    const username = params.username;

    let stats: Stats;
    let user: ScratchUser;

    try {
        [stats, user] = await Promise.all([
            get(`/users/${username}/stats`),
            get(`/users/${username}`),
        ]);
    } catch {
        return UserNotFound(username);
    }

    const total = [...stats.results].reduce(
        (acc: number, x: Result) => acc + x.count,
        0,
    );
    const sorted = [...stats.results].sort((a, b) => b.count - a.count);
    const top = sorted.slice(0, MAX_CATEGORIES);
    const otherCount = sorted
        .slice(MAX_CATEGORIES)
        .reduce((sum, s) => sum + s.count, 0);

    if (otherCount > 0) {
        top.push({ group: "other", count: otherCount });
    }

    const maxDigits = Math.max(
        ...top.map((s) => s.count.toLocaleString("en-US").length),
    );
    const chartWidth =
        maxDigits < 3
            ? "w-[75%]"
            : maxDigits < 4
              ? "w-[68%]"
              : maxDigits < 6
                ? "w-[62%]"
                : "w-[60%]";

    const charts = top.map((s) => (
        <ChartRow
            key={s.group}
            {...s}
            total={total}
            length={top.length}
            chartWidth={chartWidth}
        />
    ));

    const { name, size } = getUsernameDisplay(username);
    const scratches = total === 1 ? "Scratch" : "Scratches";

    return new ImageResponse(
        <div tw="flex w-full h-full bg-zinc-800 text-slate-50 text-5xl">
            <div tw="flex flex-col h-full w-[60%] justify-between">
                <div tw="flex flex-row mt-15 ml-10">
                    <img
                        tw="flex rounded-full w-50 "
                        src={userAvatarUrl(user)}
                        alt=""
                    />
                    <div tw="flex flex-col ml-10 justify-center">
                        <div tw={`flex ${size}`}>{name}</div>
                        <div tw="flex mt-5">{`${total.toLocaleString("en-US")} ${scratches}`}</div>
                    </div>
                </div>

                <div tw="flex items-center ml-5 mb-5">
                    <PurpleFrog width={64} height={64} tw="m-2" />
                    <span tw="ml-3">decomp.me</span>
                </div>
            </div>

            <div tw="flex flex-col flex-1 justify-around w-[40%] my-5 mr-5">
                {charts}
            </div>
        </div>,
        {
            width: IMAGE_WIDTH_PX,
            height: IMAGE_HEIGHT_PX,
        },
    );
}
