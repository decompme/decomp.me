import { Scratch } from "../../../lib/api"
import { useWarnBeforeUnload } from "../../../lib/hooks"

export type Props = {
    isSaved: boolean
    isForking: boolean
    scratch: Scratch
}

export default function useWarnBeforeScratchUnload({ isSaved, isForking, scratch }: Props) {
    useWarnBeforeUnload(
        !isSaved && !isForking,
        scratch.owner?.is_you
            ? "You have not saved your changes to this scratch. Discard changes?"
            : "You have edited this scratch but not saved it in a fork. Discard changes?",
    )
}
