import Image from "next/image"
import Link from "next/link"

import { DiamondIcon, GearIcon, MarkGithubIcon } from "@primer/octicons-react"

import UnderlineNav, { Counter } from "../components/UnderlineNav"
import * as api from "../lib/api"

import PlatformIcon from "./PlatformSelect/PlatformIcon"
import PlatformName from "./PlatformSelect/PlatformName"
import styles from "./ProjectHeader.module.scss"

export interface Props {
    project: api.Project
}

export default function ProjectHeader({ project }: Props) {
    const isMember = api.useIsUserProjectMember(project)

    return <>
        <header className={styles.header}>
            <div className={styles.headerInner}>
                <h1>
                    <Image src={project.icon_url} alt="" width={32} height={32} />
                    {project.slug}
                </h1>
                <p>{project.description}</p>
                <div className={styles.metadata}>
                    <Link href={project.repo.html_url}>
                        <a>
                            <MarkGithubIcon size={16} />
                            {project.repo.owner}/{project.repo.repo}
                        </a>
                    </Link>
                    {project.most_common_platform && <div className={styles.platform}>
                        <PlatformIcon platform={project.most_common_platform} size={16} />
                        <PlatformName platform={project.most_common_platform} />
                    </div>}
                </div>
            </div>
        </header>
        <UnderlineNav
            maxWidth="50rem"
            links={[
                {
                    href: `/projects/${project.slug}`,
                    label: <>
                        <DiamondIcon /> Functions <Counter>{project.unmatched_function_count}</Counter>
                    </>,
                },
                isMember && {
                    href: `/projects/${project.slug}/settings`,
                    label: <><GearIcon /> Settings</>,
                },
            ]}
        />
    </>
}