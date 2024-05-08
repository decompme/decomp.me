import { TerseScratch } from "@/lib/api"

import { styles } from "./CommentsPanel.module.scss"

type Props = {
    scratch: TerseScratch
}

export default function CommentsPanel({ scratch }): Props {
    return (
        <div className="h-full p-4 overflow-auto">
        </div>
    )
}
