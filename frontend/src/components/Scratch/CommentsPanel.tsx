import { useRef } from "react"

import dynamic from "next/dynamic"

import Loading from "@/components/loading.svg"
import { TerseScratch } from "@/lib/api"

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
        <div ref={scrollRef} className="h-full overflow-y-auto overflow-x-hidden px-4">
            <Comments scratch={scratch} scrollRef={scrollRef} />
        </div>
    )
}
