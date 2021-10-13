import Link from "next/link"

import * as api from "../../lib/api"
import UserLink from "../user/UserLink"

import styles from "./AboutScratch.module.scss"

function ScratchLink({ slug }: { slug: string }) {
    const { scratch } = api.useScratch(slug)

    return <span className={styles.scratchLinkContainer}>
        <Link href={`/scratch/${scratch.slug}`}>
            <a className={styles.scratchLink}>
                {scratch.name || "Untitled scratch"}
            </a>
        </Link>
        <span className={styles.scratchLinkByText}>by</span>
        <UserLink user={scratch.owner} />
    </span>
}

export type Props = {
    scratch: api.Scratch
    setScratch?: (scratch: Partial<api.Scratch>) => void
}

export default function AboutScratch({ scratch, setScratch }: Props) {
    return <div className={styles.container}>
        <div>
            <div className={styles.horizontalField}>
                <p className={styles.label}>Owner</p>
                <UserLink user={scratch.owner} />
            </div>
            {scratch.parent &&<div className={styles.horizontalField}>
                <p className={styles.label}>Fork of</p>
                <ScratchLink slug={scratch.parent} />
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
                placeholder="Write something interesting about your scratch"
            />
        </div> : <div />}
    </div>
}
