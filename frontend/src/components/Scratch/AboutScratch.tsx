import Link from "next/link"

import TimeAgo from "react-timeago"
import useSWR from "swr"

import * as api from "../../lib/api"
import LoadingSpinner from "../loading.svg"
import PlatformIcon from "../PlatformSelect/PlatformIcon"
import PlatformName from "../PlatformSelect/PlatformName"
import { getScoreText } from "../ScoreBadge"
import UserLink from "../user/UserLink"

import styles from "./AboutScratch.module.scss"

function ScratchLink({ url }: { url: string }) {
    const { data: scratch, error } = useSWR<api.Scratch>(url, api.get)

    if (error) {
        throw error
    }

    if (!scratch) {
        return <span className={styles.scratchLinkContainer}>
            <LoadingSpinner height={18} />
        </span>
    }

    return (
        <span className={styles.scratchLinkContainer}>
            <Link href={scratch.html_url} className={styles.scratchLink}>

                {scratch.name || "Untitled scratch"}

            </Link>
            {scratch.owner && <>
                <span className={styles.scratchLinkByText}>by</span>
                <UserLink user={scratch.owner} />
            </>}
        </span>
    )
}

function FamilyField({ scratch }: { scratch: api.Scratch }) {
    const { data } = useSWR<api.TerseScratch[]>(`/scratch/${scratch.slug}/family`, api.get)

    return (
        <div className={styles.horizontalField}>
            <p className={styles.label}>Family</p>
            {(data?.length ?? 1) == 1
                ? "No family"
                : <Link href={`/scratch/${scratch.slug}/family`}>
                    {`${data.length} scratches`}
                </Link>
            }
        </div>
    )
}

export type Props = {
    scratch: api.Scratch
    setScratch?: (scratch: Partial<api.Scratch>) => void
}

export default function AboutScratch({ scratch, setScratch }: Props) {
    const { data: project } = useSWR<api.Project>(scratch.project, api.get)
    const { data: projectFunction } = useSWR<api.ProjectFunction>(scratch.project_function, api.get)

    return (
        <div className={styles.container}>
            <div>
                <div className={styles.horizontalField}>
                    <p className={styles.label}>Score</p>
                    <span>{getScoreText(scratch.score, scratch.max_score)}</span>
                </div>
                {<div className={styles.horizontalField}>
                    <p className={styles.label}>Owner</p>
                    {scratch.owner && <UserLink user={scratch.owner} />}
                </div>}
                {scratch.parent &&<div className={styles.horizontalField}>
                    <p className={styles.label}>Fork of</p>
                    <ScratchLink url={scratch.parent} />
                </div>}
                <FamilyField scratch={scratch} />
                <div className={styles.horizontalField}>
                    <p className={styles.label}>Platform</p>
                    <PlatformIcon platform={scratch.platform} className={styles.platformIcon} />
                    <PlatformName platform={scratch.platform} />
                </div>
                {projectFunction && project && <div className={styles.horizontalField}>
                    <p className={styles.label}>Attempt of</p>
                    <div className={styles.projectFunctionLinks}>
                        <Link href={projectFunction.html_url}>
                            {projectFunction.display_name}
                        </Link>
                        {" "}
                        <Link href={project.html_url}>
                            ({project.slug})
                        </Link>
                    </div>
                </div>}
                <div className={styles.horizontalField}>
                    <p className={styles.label}>Created</p>
                    <TimeAgo date={scratch.creation_time} />
                </div>
                <div className={styles.horizontalField}>
                    <p className={styles.label}>Modified</p>
                    <TimeAgo date={scratch.last_updated} />
                </div>
            </div>

            <hr className={styles.rule} />

            {setScratch || scratch.description ? <div className={styles.grow}>
                <p className={styles.label}>Description</p>
                <textarea
                    className={styles.textArea}
                    value={scratch.description}
                    disabled={!setScratch}
                    onChange={event => setScratch && setScratch({ description: event.target.value })}
                    maxLength={5000}
                    placeholder="Add any notes about the scratch here"
                />
            </div> : <div />}
        </div>
    )
}
