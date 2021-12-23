import { post, Scratch } from "../../../lib/api"

export type Props = {
    tryClaim?: boolean
    scratch: Scratch
    savedScratch: Readonly<Scratch>
    isClaiming: boolean
    setIsClaiming: (value: boolean) => void
}

export default function tryClaimScratch({ tryClaim, scratch, savedScratch, isClaiming, setIsClaiming }) {
    // Claim the scratch
    if (tryClaim && !savedScratch?.owner && typeof window !== "undefined") {
        if (isClaiming) {
            // Promise that never resolves, since the page will reload when the claim is done
            throw new Promise(() => {})
        }

        console.log("Claiming scratch", savedScratch)
        setIsClaiming(true)

        throw post(`/scratch/${scratch.slug}/claim`, {})
            .then(({ success }) => {
                if (!success)
                    return Promise.reject(new Error("Scratch already claimed"))
            })
            .catch(console.error)
            .then(() => {
                window.location.reload()
            })
    }
}
