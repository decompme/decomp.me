import { ReactNode } from "react"

export type Props = {
    children: ReactNode
}

export default function GhostButton({ children }: Props) {
    return <button className="rounded bg-black/0 px-2 py-1 text-sm transition-colors hover:bg-black/5 active:translate-y-px dark:bg-white/0 dark:hover:bg-white/5">
        {children}
    </button>
}
