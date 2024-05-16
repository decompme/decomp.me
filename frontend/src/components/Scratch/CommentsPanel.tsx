import dynamic from "next/dynamic"

import { TerseScratch } from "@/lib/api"
import Loading from "@/components/loading.svg"
import { useRef } from "react"


type Props = {
    scratch: TerseScratch
}
const Comments = dynamic(() => import("./Comments"), {
    loading: () => <div className="flex size-full items-center justify-center">
        <Loading className="size-8 animate-pulse" />
    </div>,
})



export default function CommentsPanel({ scratch }: Props) {
    const scrollRef = useRef<HTMLDivElement>(null)
    return (
        <div ref={scrollRef} className="h-full pl-4 pr-4 overflow-y-auto overflow-x-hidden">
            <Comments scratch={scratch} scrollRef={scrollRef} />
        </div>
    )
}
