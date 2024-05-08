import { ReactNode } from "react"

export default function Layout({ children }: { children: ReactNode }) {
    return <div className="mx-auto max-w-[46.5rem] p-4 pb-2 text-justify text-base leading-normal">
        {children}
    </div>
}
