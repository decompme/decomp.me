import { useState } from "react"

import { GetStaticProps } from "next"

import Image from "next/image"

import { MarkGithubIcon } from "@primer/octicons-react"

import Footer from "../../components/Footer"
import Nav from "../../components/Nav"
import PageTitle from "../../components/PageTitle"
import ScratchList, { ScratchItemNoOwner } from "../../components/ScratchList"
import Tabs, { Tab } from "../../components/Tabs"
import * as api from "../../lib/api"

import styles from "./[username].module.scss"

// dynamically render all pages
export async function getStaticPaths() {
    return {
        paths: [],
        fallback: "blocking",
    }
}

export const getStaticProps: GetStaticProps = async context => {
    const { username } = context.params

    try {
        const user: api.User = await api.get(`/users/${username}`)

        return {
            props: {
                user,
            },
            revalidate: 10,
        }
    } catch (error) {
        return {
            notFound: true,
            revalidate: 10,
        }
    }
}

export default function UserPage({ user }: { user: api.User }) {
    const [activeTab, setActiveTab] = useState("scratches")

    return <>
        <PageTitle title={user.name || user.username} />
        <Nav />
        <main className={styles.pageContainer}>
            <header className={styles.header}>
                <div className={styles.headerInner}>
                    {user.avatar_url && <Image
                        className={styles.avatar}
                        src={user.avatar_url}
                        alt="User avatar"
                        width={64}
                        height={64}
                    />}
                    <h1 className={styles.name}>
                        <div>{user.name}</div>
                        <div className={styles.username}>
                            @{user.username}

                            {user.github_html_url && <a href={user.github_html_url}>
                                <MarkGithubIcon size={24} />
                            </a>}
                        </div>
                    </h1>
                </div>
            </header>

            <section>
                <Tabs activeTab={activeTab} onChange={setActiveTab} className={styles.tabs}>
                    <Tab tabKey="scratches" label="Scratches" />
                </Tabs>

                {activeTab === "scratches" && <ScratchList
                    url={user.url + "/scratches?page_size=32"}
                    item={ScratchItemNoOwner}
                    className={styles.scratchList}
                />}
            </section>
        </main>
        <Footer />
    </>
}
