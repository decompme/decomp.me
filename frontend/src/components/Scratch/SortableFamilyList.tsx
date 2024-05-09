import { useMemo, useState } from "react"

import Link from "next/link"

import classNames from "classnames"
import useSWR from "swr"

import { get } from "@/lib/api/request"
import { TerseScratch } from "@/lib/api/types"
import { scratchUrl } from "@/lib/api/urls"

import { getScoreAsFraction, getScoreText } from "../ScoreBadge"
import Sort, { SortMode, compareScratchScores, produceSortFunction } from "../Sort"
import UserLink from "../user/UserLink"

function useFamily(scratch: TerseScratch) {
    const { data: family } = useSWR<TerseScratch[]>(scratchUrl(scratch) + "/family", get, {
        suspense: true,
    })

    const [sortMode, setSortMode] = useState(SortMode.SCORE)
    const sorted = useMemo(() => [...family].sort(produceSortFunction(sortMode)), [family, sortMode])

    return { sorted, sortMode, setSortMode }
}

function FamilyMember({
    scratch,
    isCurrent,
    isBetter,
}: {
    scratch: TerseScratch
    isCurrent: boolean
    isBetter: boolean
}) {
    return <div className="flex">
        <UserLink user={scratch.owner} />
        <span className="mx-2 text-gray-8">/</span>
        {isCurrent ? <span className="font-medium text-gray-11">
            This scratch
        </span> : <Link href={scratchUrl(scratch)} className="font-medium">
            {scratch.name}
        </Link>}
        <div className="grow" />
        <div
            title={getScoreAsFraction(scratch.score, scratch.max_score)}
            className={classNames({ "text-gray-11": !isBetter })}
        >
            {getScoreText(scratch.score, scratch.max_score, scratch.match_override)}
        </div>
    </div>
}

export default function SortableFamilyList({ scratch }: { scratch: TerseScratch }) {
    const family = useFamily(scratch)

    if (family.sorted.length <= 1) {
        return <div className="flex h-full items-center justify-center">
            <div className="max-w-prose text-center">
                <div className="mb-2 text-xl">
                    No parents or forks
                </div>
                <p className="text-gray-11">
                    This scratch has no family members.
                    It's the only attempt at this function.
                </p>
            </div>
        </div>
    }

    return <div>
        <div className="mb-4 flex items-center">
            <div>
                {family.sorted.length} family members
            </div>
            <div className="grow" />
            <Sort sortMode={family.sortMode} setSortMode={family.setSortMode} />
        </div>
        <ol>
            {family.sorted.map(member => <li key={scratchUrl(member)} className="mb-2">
                <FamilyMember
                    scratch={member}
                    isCurrent={scratchUrl(member) === scratchUrl(scratch)}
                    isBetter={compareScratchScores(member, scratch) < 0}
                />
            </li>)}
        </ol>
    </div>
}
