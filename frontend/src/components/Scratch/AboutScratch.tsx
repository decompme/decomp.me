import Link from "next/link"

import useSWR from "swr"

import * as api from "../../lib/api"
import GitHubLoginButton from "../GitHubLoginButton"
import LoadingSpinner from "../loading.svg"
import UserLink from "../user/UserLink"

import styles from "./AboutScratch.module.scss"
import ClaimScratchButton from "./buttons/ClaimScratchButton"

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

    return <span className={styles.scratchLinkContainer}>
        <Link href={`/scratch/${scratch.slug}`}>
            <a className={styles.scratchLink}>
                {scratch.name || "Untitled scratch"}
            </a>
        </Link>
        {scratch.owner && <>
            <span className={styles.scratchLinkByText}>by</span>
            <UserLink user={scratch.owner} />
        </>}
    </span>
}

export type Props = {
    scratch: api.Scratch
    setScratch?: (scratch: Partial<api.Scratch>) => void
}

export default function AboutScratch({ scratch, setScratch }: Props) {
    const userIsYou = api.useUserIsYou()

    return <div className={styles.container}>
        <div>
            <div className={styles.horizontalField}>
                <p className={styles.label}>Owner</p>
                {scratch.owner
                    ? <UserLink user={scratch.owner} />
                    : <ClaimScratchButton scratch={scratch} />
                }
                {scratch.owner?.is_anonymous && userIsYou(scratch.owner)
                    && <GitHubLoginButton popup label="Sign in to keep" className={styles.signInPrompt} />
                }
            </div>
            {scratch.parent &&<div className={styles.horizontalField}>
                <p className={styles.label}>Fork of</p>
                <ScratchLink url={scratch.parent} />
            </div>}
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

        {process.env.NODE_ENV === "development" && <pre>{JSON.stringify(scratch, null, 4)}</pre>}
    </div>
}
