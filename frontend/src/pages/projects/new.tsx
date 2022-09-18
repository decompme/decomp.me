import { useCallback, useEffect, useState } from "react"

import AsyncButton from "../../components/AsyncButton"
import Footer from "../../components/Footer"
import GitHubLoginButton from "../../components/GitHubLoginButton"
import GitHubRepoPicker, { isValidIdentifierKey } from "../../components/GitHubRepoPicker"
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
    const [name, setName] = useState("project")

    // Default branch name
    useEffect(() => {
        if (branch.length == 0)
            setBranch(defaultBranch)
    }, [branch, defaultBranch])

    // Default project name
    useEffect(() => {
        if (name.length == 0)
            setName(repoName)
    }, [name.length, repoName])

    const handleRepoChange = useCallback(({ owner, repo, defaultBranch }) => {
        setRepoOwner(owner)
        setRepoName(repo)
        setName(repo)
        setBranch(defaultBranch)
        setDefaultBranch(defaultBranch)
    }, [])

    const submit = useCallback(async () => {
        throw new Error("TODO")
    }, [])

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

                    <h2 className={styles.label}>Project URL</h2>
                    <div className={styles.urlInput}>
                        decomp.me/<StringInput
                            label="Project name"
                            value={name}
                            onChange={setName}
                            isValidKey={isValidIdentifierKey}
                        />
                    </div>

                    <h2 className={styles.label}>Function import config</h2>
                    todo

                    <hr className={styles.rule} />

                    {isSignedIn ? <AsyncButton
                        primary
                        onClick={submit}
                        errorPlacement="right-center"
                        disabled={!isSignedIn}
                    >
                        Import project
                    </AsyncButton> : <GitHubLoginButton popup label="Sign in to create projects" />}
                </div>
            </div>
        </main>
        <Footer />
    </>
}
