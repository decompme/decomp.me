import Image from "next/image"

import { ProjectIcon as ProjectOcticon } from "@primer/octicons-react"
import useSWR from "swr"

import * as api from "@/lib/api"

export type Props = {
    project: api.Project | string
    size: number
    className?: string
    priority?: boolean
}

export default function ProjectIcon({ project, size, className, priority }: Props) {
    const { data, error } = useSWR<api.Project>(typeof project === "string" ? project : project.url, api.get, {
        fallbackData: typeof project === "string" ? undefined : project,
    })

    if (error)
        console.error(error)

    return data?.icon
        ? <Image
            className={className}
            src={data.icon}
            alt=""
            width={size}
            height={size}
            priority={priority}
            style={{ borderRadius: (size / 12) + "px" }}
        />
        : <ProjectOcticon className={className} size={size} />
}
