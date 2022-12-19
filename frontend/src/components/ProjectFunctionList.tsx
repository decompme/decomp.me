import { useState } from "react"

import Link from "next/link"

import { RepoForkedIcon } from "@primer/octicons-react"
import classNames from "classnames"

import * as api from "../lib/api"

import AsyncButton from "./AsyncButton"
import styles from "./ProjectFunctionList.module.scss"
import SearchBox from "./SearchBox"

function ProjectFunction({ func }: { func: api.ProjectFunction }) {
    return (
        <div className={styles.result}>
            <div className={styles.header}>
                <Link href={func.html_url} className={classNames(styles.link, styles.name)}>

                    {func.display_name}

                </Link>
            </div>
            <div className={styles.actions}>
                <div>
                    {func.src_file}
                </div>
                <div>
                    <RepoForkedIcon />
                    {func.attempts_count === 1 ? "1 attempt" : `${func.attempts_count} attempts`}
                </div>
                {/*<div>
                    Added <TimeAgo date={func.creation_time} />
                </div>*/}
            </div>
        </div>
    )
}

export interface Props {
    projectUrl: string
    className?: string
    children?: React.ReactNode
}

export default function ProjectFunctionList({ projectUrl, className, children }: Props) {
    const [searchTerm, setSearchTerm] = useState("")
    const { results, isLoading, hasNext, loadNext } = api.usePaginated<api.ProjectFunction>(projectUrl + `/functions?search=${searchTerm}&is_matched_in_repo=false`)

    return <div className={className}>
        <div className={styles.header}>
            <SearchBox
                className={styles.searchBox}
                placeholder="Find a function..."
                isLoading={isLoading}
                onSearch={setSearchTerm}
                searchAfterTimeout={400}
            />
            {children}
        </div>
        {results.length === 0 && !isLoading && <div className={styles.empty}>
            No functions found :(
        </div>}
        <ul className={styles.list}>
            {results.map(func => (
                <li key={func.url} className={styles.item}>
                    <ProjectFunction func={func} />
                </li>
            ))}
        </ul>
        {hasNext && !isLoading && <div className={styles.loadButton}>
            <AsyncButton onClick={loadNext}>
                Show more
            </AsyncButton>
        </div>}
    </div>
}
