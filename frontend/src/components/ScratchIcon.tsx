import * as api from "@/lib/api"

import PlatformIcon from "./PlatformSelect/PlatformIcon"
import ProjectIcon from "./ProjectIcon"

export type Props = {
    scratch: api.TerseScratch
    size: number
    className?: string
}

export default function ScratchIcon(props: Props) {
    if (props.scratch.project) {
        return <ProjectIcon {...props} project={props.scratch.project} />
    } else {
        return <PlatformIcon {...props} platform={props.scratch.platform} />
    }
}
