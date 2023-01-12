import { GetStaticPaths, GetStaticProps } from "next"

import Head from "next/head"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { ArrowRightIcon, GitPullRequestIcon } from "@primer/octicons-react"

import AsyncButton from "@/components/AsyncButton"
import Breadcrumbs from "@/components/Breadcrumbs"
import Button from "@/components/Button"
import ErrorBoundary from "@/components/ErrorBoundary"
import Footer from "@/components/Footer"
import Nav from "@/components/Nav"
import PageTitle from "@/components/PageTitle"
import ProjectIcon from "@/components/ProjectIcon"
import PrScratchBasket, { useBasket } from "@/components/PrScratchBasket"
import { ScratchItem } from "@/components/ScratchList"
import * as api from "@/lib/api"

import styles from "./[function].module.scss"

export const getStaticPaths: GetStaticPaths = async () => {
    return {
        paths: [],
        fallback: "blocking",
    }
}

export const getStaticProps: GetStaticProps = async context => {
    try {
        const project: api.Project = await api.get(`/projects/${context.params.project}`)

        // Treat slug as a ROM address
        const slug = context.params.function as string
        const romAddress = parseInt(slug, 16)

        // Search for a function with the given ROM address
        const page: api.Page<api.ProjectFunction> = await api.get(`/projects/${context.params.project}/functions?rom_address=${romAddress}`)
        const func = page.results[0]

        const canonicalSlug = func.html_url.split("/").pop()

        if (slug == canonicalSlug) {
            const attempts: api.TerseScratch[] = await api.get(func.url + "/attempts")

            return {
                props: {
                    project,
                    func,
                    attempts,
                },
                revalidate: 60, // cache for a minute
            }
        } else {
            // Redirect to canonical URL
            return {
                props: {},
                redirect: {
                    destination: func.html_url,
                },
            }
        }
    } catch (error) {
        console.log(error)
        return {
            notFound: true,
            revalidate: true,
        }
    }
}

export default function ProjectFunctionPage({ project, func, attempts }: { project: api.Project, func: api.ProjectFunction, attempts: api.TerseScratch[] }) {
    const router = useRouter()
    const start = async () => {
        const scratch = await api.post(func.url + "/attempts", {})
        await router.push(scratch.html_url)
    }

    // Find an attempt by this user
    const userIsYou = api.useUserIsYou()
    const userAttempt = attempts.find(scratch => userIsYou(scratch.owner))

    const basket = useBasket(project)
    const canCreatePr = api.useIsUserProjectMember(project)
    const basketHasThisFunc = basket.scratches.some(s => s.project_function == func.url)

    return <>
        <Head><PageTitle title={func.display_name} /></Head>
        <Nav />
        <header className={styles.header}>
            <div className={styles.headerInner}>
                <Breadcrumbs pages={[
                    {
                        label: <div className={styles.projectLink}>
                            <ProjectIcon project={project} size={24} />
                            {project.slug}
                        </div>,
                        href: project.html_url,
                    },
                    {
                        label: func.display_name,
                    },
                ]} />
            </div>
        </header>
        <PrScratchBasket project={project} />
        <main>
            <ErrorBoundary>
                <div className={styles.container}>
                    <section className={styles.attempts}>
                        <h2>
                            <span>Attempts</span>
                            <AsyncButton onClick={start} primary={!userAttempt}>
                                New attempt
                                <ArrowRightIcon />
                            </AsyncButton>
                            {userAttempt && <Link href={userAttempt.html_url}>

                                <Button primary>
                                    Continue your attempt
                                    <ArrowRightIcon />
                                </Button>

                            </Link>}
                        </h2>
                        {attempts.length === 0 ? <div className={styles.noAttempts}>
                            No attempts yet
                        </div> : <ul>
                            {attempts.map(scratch => {
                                const isInPr = !!basket.scratches.find(s => s.url == scratch.url)
                                const isMatch = scratch.score == 0

                                return <ScratchItem key={scratch.url} scratch={scratch}>
                                    {canCreatePr && isMatch && <Button
                                        disabled={isInPr || basketHasThisFunc}
                                        onClick={() => basket.addScratch(scratch)}
                                    >
                                        <GitPullRequestIcon />
                                        {isInPr ? "Added" : "Add to PR"}
                                    </Button>}
                                </ScratchItem>
                            })}
                        </ul>}
                    </section>
                </div>
            </ErrorBoundary>
        </main>
        <Footer />
    </>
}
