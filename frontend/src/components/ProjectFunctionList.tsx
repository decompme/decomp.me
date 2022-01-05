import Link from "next/link"

import { ArrowRightIcon } from "@primer/octicons-react"
import classNames from "classnames"
import TimeAgo from "react-timeago"

import * as api from "../lib/api"

import AsyncButton from "./AsyncButton"
import COMPILERS from "./compiler/compilers"
import LoadingSpinner from "./loading.svg"
import styles from "./ProjectFunctionList.module.scss"

function ProjectFunction({ func }: { func: api.ProjectFunction }) {
    const compilerName = COMPILERS.find(c => c.id === func.scratch.compiler)?.name || func.scratch.compiler
    const forkScratchAndGo = api.useForkScratchAndGo(func.scratch)

    return <div className={styles.result}>
        <div className={styles.header}>
            <Link href={func.scratch.html_url}>
                <a className={classNames(styles.link, styles.name)}>
                    {func.scratch.name}
                </a>
            </Link>
        </div>
        <div className={styles.metadata}>
            {compilerName} • Added <TimeAgo date={func.creation_time} />
        </div>
        <div className={styles.actions}>
            {/*<Link href={func.scratch.html_url + "/forks"}>
                <a>
                    <Button>
                        <RepoForkedIcon />
                        {func.scratch.forks.length} attempts
                    </Button>
                </a>
            </Link>*/}
            <AsyncButton onClick={forkScratchAndGo}>
                Start
                <ArrowRightIcon />
            </AsyncButton>
            {func.scratch.max_score != -1 && <div className={styles.complexityBg}>
                {func.scratch.max_score.toLocaleString()} pts
            </div>}
        </div>
    </div>
}

export interface Props {
    projectUrl: string
    className?: string
}

export default function ProjectFunctionList({ projectUrl, className }: Props) {
    const { results, isLoading, hasNext, loadNext } = api.usePaginated<api.ProjectFunction>(projectUrl + "/functions")

    if (results.length === 0 && isLoading) {
        return <div className={classNames(styles.loading, className)}>
            <LoadingSpinner width="1.5em" height="1.5em" />
            Just a moment...
        </div>
    }

    return <ul className={classNames(styles.list, className)}>
        {results.map(func => (
            <li key={func.id} className={styles.item}>
                <ProjectFunction func={func} />
            </li>
        ))}
        {hasNext && <li className={styles.loadButton}>
            <AsyncButton onClick={loadNext}>
                Show more
            </AsyncButton>
        </li>}
    </ul>
}
