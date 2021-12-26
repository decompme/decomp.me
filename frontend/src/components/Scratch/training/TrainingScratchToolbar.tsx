import { useRouter } from "next/router"

import { SyncIcon, ArrowRightIcon, ArrowLeftIcon } from "@primer/octicons-react"
import classNames from "classnames"

import { getNextScenario, getPriorScenario, getScenarioDescriptionFromSlug, getScenarioNameFromSlug, useFinishedTraining } from "../../../lib/training"
import AsyncButton from "../../AsyncButton"
import Button from "../../Button"
import ScoreBadge from "../../ScoreBadge"

import styles from "./TrainingScratchToolbar.module.scss"

function goToSlug(router, slug: string, goTo: "next" | "prior") {
    const temp = (goTo === "next" ? getNextScenario(slug) : getPriorScenario(slug))?.slug

    if (temp)
        router.push(`/training/${temp}`)
}

export type Props = {
    slug: string
    isCompiling: boolean
    compile: () => Promise<void>
}

export default function TrainingScratchToolbar({ slug, isCompiling, compile }: Props) {
    const router = useRouter()
    const [finishedTraining] = useFinishedTraining()

    return (
        <div className={styles.toolbar}>
            <div className={styles.trainingScratchHeaderContainer}>
                <div className={styles.trainingScratchHeader}>
                    {getScenarioNameFromSlug(slug)}
                    <div className={styles.finishedContainer}>
                        {finishedTraining.includes(slug) && <ScoreBadge score={0} maxScore={0} />}
                    </div>
                </div>
                <div className={classNames(styles.trainingScratchHeader, styles.trainingScratchHeaderDescription)}>
                    {getScenarioDescriptionFromSlug(slug)}
                </div>
                <div className={styles.trainingScratchButtonList}>
                    <Button disabled={!getPriorScenario(slug)} onClick={() => goToSlug(router, slug, "prior")}>
                        <ArrowLeftIcon size={16} /> Prior scenario
                    </Button>
                    <AsyncButton onClick={compile} forceLoading={isCompiling}>
                        <SyncIcon size={16} /> Compile
                    </AsyncButton>
                    <Button disabled={!getNextScenario(slug)} onClick={() => goToSlug(router, slug, "next")}>
                            Next scenario <ArrowRightIcon size={16} />
                    </Button>
                </div>
            </div>
        </div>
    )
}
