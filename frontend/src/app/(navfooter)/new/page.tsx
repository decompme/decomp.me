import { getCached } from "@/lib/api/request"

import DESCRIPTION from "./description"
import NewScratchForm from "./NewScratchForm"

export default async function NewScratchPage() {
    const compilers = await getCached("/compilers")

    return <main>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-12 md:text-3xl">Start a new scratch</h1>
        <p className="max-w-prose py-3 leading-snug">{DESCRIPTION}</p>
        <NewScratchForm serverCompilers={compilers} />
    </main>
}
