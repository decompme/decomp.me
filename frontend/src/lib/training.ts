import { useEffect, useState } from "react"

import { singletonHook } from "react-singleton-hook"

interface Platform {
    name: string
    chapters: Array<Chapter>
}
interface Chapter {
    name: string
    description: string
    scenarios?: Array<Scenario>
}
interface Scenario {
    name: string
    description: string
    slug: string
    difficulty?: "easy" | "intermediate" | "advanced"
}

const getScenarioFromSlug = (slug: string) => {
    for (const platform of TRAINING_DATA) {
        for (const chapter of platform.chapters) {
            for (const scenario of chapter.scenarios) {
                if (scenario.slug === slug)
                    return scenario
            }
        }
    }
}

const getAdjacentScenarios = (currentSlug: string) => {
    for (const platform of TRAINING_DATA) {
        for (const chapter of platform.chapters) {
            for (let i = 0; i < chapter.scenarios?.length; i++) {
                if (chapter.scenarios[i].slug === currentSlug)
                    return [chapter.scenarios[i - 1], chapter.scenarios[i + 1]]
            }
        }
    }

    return [undefined, undefined]
}

export const TRAINING_DATA: Array<Platform> = [
    {
        name: "n64",
        chapters: [{
            name: "1. Functions",
            description: "How do functions work in MIPS",
            scenarios: [{
                name: "1. Empty function",
                description: "How to create the most basic function possible",
                difficulty: "easy",
                slug: "WNzJO",
            }, {
                name: "2. Parameters",
                description: "How to identify the parameters of a function",
                difficulty: "easy",
                slug: "RYE3J",
            }, {
                name: "3. Registers",
                description: "Working with the stack frame register",
                difficulty: "intermediate",
                slug: "RYE3J",
            }],
        },
        {
            name: "2. Loops",
            description: "Loops in MIPS",
        }],
    },
]

export const getScenarioNameFromSlug = (slug: string) => getScenarioFromSlug(slug)?.name || "Training"
export const getScenarioDescriptionFromSlug = (slug: string) => getScenarioFromSlug(slug)?.description
export const getPriorScenario = (currentSlug: string) => getAdjacentScenarios(currentSlug)[0]
export const getNextScenario = (currentSlug: string) => getAdjacentScenarios(currentSlug)[1]

export const useFinishedTraining = singletonHook([[], undefined, undefined, undefined], (): [string[], (slug: string) => boolean, (slug: string) => void, (slug: string) => void] => {
    const [finishedTraining, setFinishedTraining] = useState([])

    useEffect(() => {
        try {
            setFinishedTraining(JSON.parse(localStorage.getItem("finished_training")) ?? [])
        // eslint-disable-next-line no-empty
        } catch (e) {}
    }, [])

    const hasFinishedTraining = (slug: string) => finishedTraining.includes(slug)
    const addFinishedTraining = (slug: string) => {
        const newValue = finishedTraining.includes(slug) ? finishedTraining : [...finishedTraining, slug]

        localStorage.setItem("finished_training", JSON.stringify(newValue))
        setFinishedTraining(newValue)
    }
    const removeFinishedTraining = (slug: string) => {
        const newValue = finishedTraining.filter(temp => temp !== slug)

        localStorage.setItem("finished_training", JSON.stringify(newValue))
        setFinishedTraining(newValue)
    }

    return [finishedTraining, hasFinishedTraining, addFinishedTraining, removeFinishedTraining]
})
