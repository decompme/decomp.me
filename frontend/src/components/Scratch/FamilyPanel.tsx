import dynamic from "next/dynamic"

import Loading from "@/components/loading.svg"
import { TerseScratch } from "@/lib/api/types"

const SortableFamilyList = dynamic(() => import("./SortableFamilyList"), {
    loading: () => <div className="flex h-full w-full items-center justify-center">
        <Loading />
    </div>,
})

type Props = {
    scratch: TerseScratch
}

export default function FamilyPanel({ scratch }: Props) {
    return <div className="h-full p-4">
        <SortableFamilyList scratch={scratch} />
    </div>
}
