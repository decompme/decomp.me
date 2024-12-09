import { get } from "@/lib/api/request"

import DESCRIPTION from "./description"
import NewScratchForm from "./NewScratchForm"

export const metadata = {
    title: "New scratch",
}

export default async function NewScratchPage() {
    const compilers = await get("/compiler")

    return <main>
        <h1 className="font-semibold text-2xl text-gray-12 tracking-tight md:text-3xl">Start a new scratch</h1>
        <p className="max-w-prose py-3 leading-snug">{DESCRIPTION}</p>
        <NewScratchForm serverCompilers={compilers} />
    </main>
}
