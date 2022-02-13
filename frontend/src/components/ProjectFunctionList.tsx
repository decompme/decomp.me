import Link from "next/link"
import { useRouter } from "next/router"

import { ArrowRightIcon } from "@primer/octicons-react"
import classNames from "classnames"
import TimeAgo from "react-timeago"

import * as api from "../lib/api"

import AsyncButton from "./AsyncButton"
import LoadingSpinner from "./loading.svg"
import styles from "./ProjectFunctionList.module.scss"

function ProjectFunction({ func }: { func: api.ProjectFunction }) {
    const router = useRouter()

    const start = async () => {
        const scratch = await api.post(func.url + "/start", {})
        await router.push(scratch.html_url)
    }

    return <div className={styles.result}>
        <div className={styles.header}>
            <Link href={func.html_url}>
                <a className={classNames(styles.link, styles.name)}>
                    {func.display_name}
                </a>
            </Link>
        </div>
        <div className={styles.metadata}>
            Added <TimeAgo date={func.creation_time} />
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
            <AsyncButton onClick={start}>
                Start
                <ArrowRightIcon />
            </AsyncButton>
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
            <li key={func.url} className={styles.item}>
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
