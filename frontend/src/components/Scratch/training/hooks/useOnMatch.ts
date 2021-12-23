import useDeepCompareEffect from "use-deep-compare-effect"

import { Compilation } from "../../../../lib/api"

export type Props = {
    compilation: Readonly<Compilation>
    onMatch: (...args) => unknown
}

export default function useOnMatch({ compilation, onMatch }: Props) {
    useDeepCompareEffect(() => {
        if (compilation?.diff_output?.current_score === 0) {
            onMatch()
        }
    }, [compilation || {}])
}
