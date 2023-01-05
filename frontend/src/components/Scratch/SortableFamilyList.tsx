import { useMemo, useState } from "react"

import Link from "next/link"

import useSWR from "swr"

import Select from "@/components/Select2"
import { get } from "@/lib/api/request"
import { TerseScratch } from "@/lib/api/types"

import { getScoreText } from "../ScoreBadge"
import UserLink from "../user/UserLink"

enum SortMode {
    NEWEST_FIRST = "newest_first",
    OLDEST_FIRST = "oldest_first",
    LAST_UPDATED = "last_updated",
    SCORE = "score",
}

function produceSortFunction(sortMode: SortMode): (a: TerseScratch, b: TerseScratch) => number {
    switch (sortMode) {
    case SortMode.NEWEST_FIRST:
        return (a, b) => new Date(b.creation_time).getTime() - new Date(a.creation_time).getTime()
    case SortMode.OLDEST_FIRST:
        return (a, b) => new Date(a.creation_time).getTime() - new Date(b.creation_time).getTime()
    case SortMode.LAST_UPDATED:
        return (a, b) => new Date(a.last_updated).getTime() - new Date(b.last_updated).getTime()
    case SortMode.SCORE:
        return (a, b) => {
            const aScore = a.score == 0 ? Infinity : a.score
            const bScore = b.score == 0 ? Infinity : b.score

            return aScore - bScore
        }
    }
}

function useFamily(scratch: TerseScratch) {
    const { data: family } = useSWR<TerseScratch[]>(scratch.url + "/family", get, {
        suspense: true,
    })

    const [sortMode, setSortMode] = useState(SortMode.SCORE)
    const sorted = useMemo(() => [...family].sort(produceSortFunction(sortMode)), [family, sortMode])

    return { sorted, sortMode, setSortMode }
}

function FamilyMember({ scratch, isCurrent }: { scratch: TerseScratch, isCurrent: boolean }) {
    return <div className="flex">
        <UserLink user={scratch.owner} />
        <span className="mx-2 text-gray-8">/</span>
        {isCurrent ? <span className="font-medium text-gray-11">
            This scratch
        </span> : <Link href={scratch.html_url} className="font-medium">
            {scratch.name}
        </Link>}
        <div className="grow" />
        <div>
            {getScoreText(scratch.score, scratch.max_score)}
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
            <div>
                <span className="mr-2 text-sm text-gray-11">
                    Sort by
                </span>
                <Select
                    value={family.sortMode}
                    onChange={m => family.setSortMode(m as SortMode)}
                    options={{
                        [SortMode.SCORE]: "Match completion",
                        [SortMode.NEWEST_FIRST]: "Newest first",
                        [SortMode.OLDEST_FIRST]: "Oldest first",
                        [SortMode.LAST_UPDATED]: "Last modified",
                    }}
                />
            </div>
        </div>
        <ol>
            {family.sorted.map(member => <li key={member.url} className="mb-1">
                <FamilyMember scratch={member} isCurrent={member.url === scratch.url} />
            </li>)}
        </ol>
    </div>
}
