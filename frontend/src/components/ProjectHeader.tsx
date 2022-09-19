import Link from "next/link"

import { DiamondIcon, GearIcon, MarkGithubIcon } from "@primer/octicons-react"

import UnderlineNav, { Counter } from "../components/UnderlineNav"
import * as api from "../lib/api"
import { Tab } from "../pages/projects/[...project]"

import PlatformIcon from "./PlatformSelect/PlatformIcon"
import PlatformName from "./PlatformSelect/PlatformName"
import styles from "./ProjectHeader.module.scss"
import ProjectIcon from "./ProjectIcon"

export interface Props {
    project: api.Project
    tab: Tab
}

export default function ProjectHeader({ project, tab }: Props) {
    const isMember = api.useIsUserProjectMember(project)

    return <>
        <header className={styles.header}>
            <div className={styles.headerInner}>
                <ProjectIcon project={project} size={72} priority />
                <div>
                    <h1>
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
            </div>
        </header>
        <UnderlineNav
            maxWidth="50rem"
            links={[
                {
                    href: project.html_url,
                    selected: tab === Tab.FUNCTIONS,
                    label: <>
                        <DiamondIcon /> Functions <Counter>{project.unmatched_function_count}</Counter>
                    </>,
                    shallow: true,
                },
                isMember && {
                    href: project.html_url + "/settings",
                    selected: tab === Tab.SETTINGS,
                    label: <><GearIcon /> Settings</>,
                    shallow: true,
                },
            ]}
        />
    </>
}
