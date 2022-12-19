import { Dispatch, SetStateAction, useEffect, useState } from "react"

import Link from "next/link"

import { ArrowRightIcon, GitPullRequestIcon, XIcon } from "@primer/octicons-react"
import createPersistedState from "use-persisted-state"

import * as api from "../lib/api"
import { requestMissingScopes } from "../lib/oauth"

import AsyncButton from "./AsyncButton"
import Button from "./Button"
import styles from "./PrScratchBasket.module.scss"
import UserAvatar from "./user/UserAvatar"

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
        clear() {
            setBaskets({
                ...baskets,
                [project.slug]: newBasket(),
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

    const createPr = async () => {
        const { url } = await requestMissingScopes(() => api.post(`${project.url}/pr`, {
            scratch_slugs: basket.scratches.map(s => s.slug),
        }))

        basket.clear()

        window.location.href = url
    }

    return (
        <div className={styles.container}>
            <h2>
                <GitPullRequestIcon size={18} />
                Pull request
            </h2>
            <ul className={styles.list}>
                {basket.scratches.map(scratch => {
                    return (
                        <li key={scratch.url} className={styles.scratch}>
                            <UserAvatar user={scratch.owner} className={styles.icon} />
                            <Link href={scratch.html_url} className={styles.scratchLink}>

                                {scratch.name}

                            </Link>
                            <Button
                                className={styles.deleteBtn}
                                onClick={() => basket.removeScratch(scratch)}
                            >
                                <XIcon />
                            </Button>
                        </li>
                    )
                })}
            </ul>
            <div>
                <AsyncButton
                    primary
                    onClick={createPr}
                >
                    Create pull request <ArrowRightIcon />
                </AsyncButton>
            </div>
        </div>
    )
}
