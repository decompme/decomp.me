import dynamic from "next/dynamic"

import { TerseScratch } from "@/lib/api"
import Loading from "@/components/loading.svg"


type Props = {
    scratch: TerseScratch
}
const Comments = dynamic(() => import("./Comments"), {
    loading: () => <div className="flex size-full items-center justify-center">
        <Loading className="size-8 animate-pulse" />
    </div>,
})



export default function CommentsPanel({ scratch }: Props) {
    return (
        <div className="h-full p-4 overflow-auto">
            <Comments scratch={scratch} />
        </div>
    )
}
