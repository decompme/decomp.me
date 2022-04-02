import { Dispatch, SetStateAction, useEffect, useState } from "react"

import Link from "next/link"

import { DashIcon } from "@primer/octicons-react"
import createPersistedState from "use-persisted-state"

import * as api from "../lib/api"

import Button from "./Button"
import styles from "./PrScratchBasket.module.scss"

const basketsState = createPersistedState("pr-scratch-basket")

type Baskets = {
    [projectSlug: string]: Basket
}

const useBaskets: () => [Baskets, Dispatch<SetStateAction<Baskets>>] = () => basketsState({})

function newBasket(): Basket {
    return {
        scratches: [],
    }
}

export interface Basket {
    scratches: api.TerseScratch[]
}

export interface Props {
    project: api.Project
}

export function useBasket(project: api.Project) {
    const [baskets, setBaskets] = useBaskets()

    const basket = baskets[project.slug] ?? newBasket()

    // Ensure validity of persisted state
    if (!basket.scratches)
        setBaskets({ [project.slug]: newBasket() })

    return {
        ...basket,
        addScratch(scratch: api.TerseScratch) {
            if (!basket.scratches.find(s => s.url == scratch.url)) {
                setBaskets({
                    ...baskets,
                    [project.slug]: {
                        ...basket,
                        scratches: [...basket.scratches, scratch],
                    },
                })
            }
        },
        removeScratch(scratch: api.TerseScratch) {
            setBaskets({
                ...baskets,
                [project.slug]: {
                    ...basket,
                    scratches: basket.scratches.filter(s => s.url != scratch.url),
                },
            })
        },
    }
}

export default function PrScratchBasket({ project }: Props) {
    const basket = useBasket(project)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted || basket.scratches.length == 0) {
        return null
    }

    return <div className={styles.container}>
        <h2>Create pull request</h2>
        <ul>
            {basket.scratches.map(scratch => {
                return <li key={scratch.url}>
                    <Link href={scratch.html_url}>{scratch.name}</Link>
                    <Button primary onClick={() => basket.removeScratch(scratch)}>
                        <DashIcon />
                    </Button>
                </li>
            })}
        </ul>
    </div>
}
