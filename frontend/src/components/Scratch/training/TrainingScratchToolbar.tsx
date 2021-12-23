import { useRouter } from "next/router"

import { SyncIcon, ArrowRightIcon, ArrowLeftIcon } from "@primer/octicons-react"
import classNames from "classnames"

import { getFinishedTrainings, getNextScenario, getPriorScenario, getScenarioDescriptionFromSlug, getScenarioNameFromSlug } from "../../../lib/training"
import AsyncButton from "../../AsyncButton"
import Button from "../../Button"
import ScoreBadge from "../../ScoreBadge"
import styles from "../Scratch.module.scss"

export type Props = {
    slug: string
    isCompiling: boolean
    compile: () => Promise<void>
}

export default function TrainingScratchToolbar({ slug, isCompiling, compile }: Props) {
    const router = useRouter()

    return (
        <div className={styles.toolbar}>
            <div className={styles.trainingScratchHeaderContainer}>
                <div className={styles.trainingScratchHeader}>
                    {getScenarioNameFromSlug(slug)}
                    <div className={styles.finishedContainer}>
                        {getFinishedTrainings().includes(slug) && <ScoreBadge score={0} maxScore={0} />}
                    </div>
                </div>
                <div className={classNames(styles.trainingScratchHeader, styles.trainingScratchHeaderDescription)}>
                    {getScenarioDescriptionFromSlug(slug)}
                </div>
                <div className={styles.trainingScratchButtonList}>
                    <Button disabled={!getPriorScenario(slug)} onClick={() => {
                        const priorSlug = getPriorScenario(slug)?.slug

                        if (priorSlug)
                            router.push(`/training/${priorSlug}`)
                    }}>
                        <ArrowLeftIcon size={16} /> Prior scenario
                    </Button>
                    <AsyncButton onClick={compile} forceLoading={isCompiling}>
                        <SyncIcon size={16} /> Compile
                    </AsyncButton>
                    <Button disabled={!getNextScenario(slug)} onClick={() => {
                        const nextSlug = getNextScenario(slug)?.slug

                        if (nextSlug)
                            router.push(`/training/${nextSlug}`)
                    }}>
                            Next scenario <ArrowRightIcon size={16} />
                    </Button>
                </div>
            </div>
        </div>
    )
}
