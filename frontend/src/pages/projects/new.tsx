import { useCallback, useEffect, useState } from "react"

import router from "next/router"

import AsyncButton from "../../components/AsyncButton"
import Footer from "../../components/Footer"
import GitHubLoginButton from "../../components/GitHubLoginButton"
import GitHubRepoPicker, { isValidIdentifierKey } from "../../components/GitHubRepoPicker"
import ImageInput from "../../components/ImageInput"
import Nav from "../../components/Nav"
import PageTitle from "../../components/PageTitle"
import StringInput from "../../components/StringInput"
import * as api from "../../lib/api"

import styles from "./new.module.scss"

export default function NewProjectPage() {
    const [repoOwner, setRepoOwner] = useState("")
    const [repoName, setRepoName] = useState("")
    const [defaultBranch, setDefaultBranch] = useState("main")
    const [branch, setBranch] = useState(defaultBranch)
    const [slug, setSlug] = useState("project")
    const [icon, setIcon] = useState<File>()

    // Default branch name
    useEffect(() => {
        if (branch.length == 0)
            setBranch(defaultBranch)
    }, [branch, defaultBranch])

    // Default project name
    useEffect(() => {
        if (slug.length == 0)
            setSlug(repoName)
    }, [slug.length, repoName])

    // Remove dots from slug
    useEffect(() => {
        setSlug(slug.replace(/\./g, "-"))
    }, [slug])

    const handleRepoChange = useCallback(({ owner, repo, defaultBranch }) => {
        setRepoOwner(owner)
        setRepoName(repo)
        setSlug(repo)
        setBranch(defaultBranch)
        setDefaultBranch(defaultBranch)
    }, [])

    const submit = async () => {
        const data = new FormData()
        data.append("slug", slug)
        data.append("icon", icon)
        data.append("repo[owner]", repoOwner)
        data.append("repo[repo]", repoName)
        data.append("repo[branch]", branch)

        const project: api.Project = await api.post("/projects", data)
        router.push(project.html_url)
    }

    const user = api.useThisUser()
    const isSignedIn = user && !api.isAnonUser(user)

    return <>
        <PageTitle title="New project" />
        <Nav />
        <main>
            <header className={styles.header}>
                <div className={styles.container}>
                    <h1>New project</h1>
                </div>
            </header>
            <div className={styles.container}>
                <h2 className={styles.label}>Repository</h2>
                <GitHubRepoPicker
                    owner={repoOwner}
                    repo={repoName}
                    onChangeValid={handleRepoChange}
                />
                <div style={repoName == "" ? { opacity: "0.5", pointerEvents: "none" } : {}}>
                    <h2 className={styles.label}>Branch</h2>
                    <StringInput
                        className={styles.branchInput}
                        label="Branch name"
                        value={branch}
                        onChange={setBranch}
                        isValidKey={isValidIdentifierKey}
                    />

                    <h2 className={styles.label}>Project name</h2>
                    <div className={styles.urlInput}>
                        decomp.me/projects/<StringInput
                            label="Project name"
                            value={slug}
                            onChange={setSlug}
                            isValidKey={isValidIdentifierKey}
                        />
                    </div>

                    <h2 className={styles.label}>Icon</h2>
                    <ImageInput className={styles.icon} file={icon} onChange={setIcon} />

                    <hr className={styles.rule} />

                    {isSignedIn ? <AsyncButton
                        primary
                        onClick={submit}
                        errorPlacement="right-center"
                        disabled={!isSignedIn}
                    >
                        Create project
                    </AsyncButton> : <GitHubLoginButton popup label="Sign in to create projects" />}
                </div>
            </div>
        </main>
        <Footer />
    </>
}
