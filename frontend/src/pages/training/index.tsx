import { useEffect, useState } from "react"

import { GetStaticProps } from "next"

import Head from "next/head"
import { useRouter } from "next/router"

import classNames from "classnames"

import Footer from "../../components/Footer"
import Nav from "../../components/Nav"
import PlatformSelect from "../../components/PlatformSelect"
import * as api from "../../lib/api"
import { getFinishedTrainings, TRAINING_DATA } from "../../lib/training"

import styles from "./index.module.scss"

const capitalizeFirstLetter = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

// Remove when training is done
Training.getStaticProps = ({ res }) => {
    if (res) {
        res.statusCode = 404
        res.end("Not found")
        return
    }
}

export const getStaticProps: GetStaticProps = async _context => {
    const data = await api.get("/compilers")

    return {
        props: {
            serverCompilers: data,
        },
    }
}

export default function Training({ serverCompilers }: {
    serverCompilers: {
        platforms: {
            [key: string]: {
                name: string
                description: string
            }
        }
        compilers: {
            [key: string]: {
                platform: string
            }
        }
    }
}) {
    const [platform, setPlatform] = useState("")
    const [selectedChapter, setSelectedChapter] = useState(undefined)
    const router = useRouter()

    const loadScenario = async (scratchSlug: string) => {
        router.push(`/training/${scratchSlug}`)
    }

    useEffect(() => {
        setSelectedChapter(TRAINING_DATA.find(currentPlatform => currentPlatform.name === platform)?.chapters?.[0])
    }, [platform])

    return <>
        <Head>
            <title>Training | decomp.me</title>
        </Head>
        <Nav />
        <main className={styles.container}>
            <div className={styles.heading}>
                <h1>Select your training scenario</h1>
                <p>
                    In training, you can skill up your matching by recognizing
                    frequent patterns and solving them.
                </p>
            </div>

            <hr className={styles.rule} />

            <div>
                <p className={styles.label}>
                    Platform
                </p>
                <PlatformSelect
                    platforms={serverCompilers.platforms}
                    value={platform}
                    onChange={a => setPlatform(a)}
                />
            </div>

            <hr className={styles.rule} />

            <div className={styles.trainingContainer}>
                <div className={classNames(styles.trainingColumn, styles.chapters)}>
                    <p className={styles.label}>
                        Chapter
                    </p>
                    <ul className={styles.scenarioContainer}>
                        {TRAINING_DATA.find(currentPlatform => currentPlatform.name === platform)?.chapters.map((chapter, i) =>
                            <li
                                key={i}
                                className={classNames(styles.scenario, { [styles.selected]: selectedChapter === chapter })}
                                onClick={() => setSelectedChapter(chapter)}
                            >
                                <div className={styles.labelContainer}>
                                    <div className={styles.scenarioTitle}>{chapter.name}</div>
                                    <div className={styles.scenarioDescription}>{chapter.description}</div>
                                    {(() => {
                                        const finishedTraining = getFinishedTrainings()
                                        const finishedScenarios = chapter.scenarios
                                            ?.filter(scenario => finishedTraining.find(finished => scenario.slug === finished))
                                            .length ?? 0
                                        const totalScenarios = chapter.scenarios?.length ?? 0
                                        const color = finishedScenarios === totalScenarios ? "easy" : "intermediate"

                                        return (
                                            <div className={classNames(styles.scenarioLabel, totalScenarios !== 0 && styles[color])}>
                                                {finishedScenarios}/{totalScenarios}
                                            </div>
                                        )
                                    })()}
                                </div>
                            </li>
                        )}
                    </ul>
                </div>
                <div className={styles.trainingColumn}>
                    <p className={styles.label}>
                        Scenario
                    </p>
                    <ul className={styles.scenarioContainer}>
                        {(() => {
                            const finishedTraining = getFinishedTrainings()
                            return selectedChapter?.scenarios?.map((scenario, i) =>
                                <li
                                    key={i}
                                    className={classNames(styles.scenario, finishedTraining.find(entry => entry === scenario.slug) && styles.scenarioFinished)}
                                    onClick={() => loadScenario(scenario.slug)}
                                >
                                    <div className={styles.labelContainer}>
                                        <div className={styles.scenarioTitle}>{scenario.name}</div>
                                        <div className={styles.scenarioDescription}>{scenario.description}</div>
                                        <div className={classNames(styles.scenarioLabel, styles[scenario.difficulty])}>{capitalizeFirstLetter(scenario.difficulty)}</div>
                                    </div>
                                </li>
                            )
                        })()}
                    </ul>
                </div>
            </div>
        </main>
        <Footer />
    </>
}
