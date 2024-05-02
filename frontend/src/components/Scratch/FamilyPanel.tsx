import dynamic from "next/dynamic"

import Loading from "@/components/loading.svg"
import { TerseScratch } from "@/lib/api/types"

const SortableFamilyList = dynamic(() => import("./SortableFamilyList"), {
    loading: () => <div className="flex size-full items-center justify-center">
        <Loading className="size-8 animate-pulse" />
    </div>,
})

type Props = {
    scratch: TerseScratch
}

export default function FamilyPanel({ scratch }: Props) {
    return <div className="h-full p-4 overflow-auto">
        <SortableFamilyList scratch={scratch} />
    </div>
}
