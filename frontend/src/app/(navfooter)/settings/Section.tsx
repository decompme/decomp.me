import type { ReactNode } from "react"

export type Props = {
    title: string
    children: ReactNode
}

export default function Section({ title, children }: Props) {
    return <section className="mb-8">
        <h2 className="border-b border-gray-6 py-1 text-2xl font-semibold">{title}</h2>
        <div className="pt-4">
            {children}
        </div>
    </section>
}
