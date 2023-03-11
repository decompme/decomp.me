import { ReactNode } from "react"

export default function Layout({ children }: { children: ReactNode }) {
    return <div className="mx-auto max-w-screen-lg p-4 pb-2 text-justify text-base leading-normal">
        {children}
    </div>
}
