import { GetStaticPaths, GetStaticProps } from "next"

import Image from "next/image"
import Link from "next/link"

import ErrorBoundary from "../../components/ErrorBoundary"
import Footer from "../../components/Footer"
import Nav from "../../components/Nav"
import PageTitle from "../../components/PageTitle"
import * as api from "../../lib/api"

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
        const fn: api.ProjectFunction = await api.get(`/projects/${context.params.project}/functions/${context.params.function}`)

        return {
            props: {
                project,
                fn,
            },
            revalidate: 60, // cache for a minute
        }
    } catch (error) {
        console.log(error)
        return {
            notFound: true,
            revalidate: true,
        }
    }
}

export default function ProjectFunctionPage({ project, fn }: { project: api.Project, fn: api.ProjectFunction }) {
    return <>
        <PageTitle title={fn.display_name} />
        <Nav />
        <header className={styles.header}>
            <div className={styles.headerInner}>
                <h1>
                    <Link href={project.html_url}>
                        <a>
                            <Image src={project.icon_url} alt="" width={32} height={32} />
                            {project.slug}
                        </a>
                    </Link>
                    {" / "}
                    <a>
                        {fn.display_name}
                    </a>
                </h1>
            </div>
        </header>
        <main className={styles.container}>
            <ErrorBoundary>
                {/* TODO */}
            </ErrorBoundary>
        </main>
        <Footer />
    </>
}
