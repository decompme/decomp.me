import { h } from "preact"
import { MarkGithubIcon } from "@primer/octicons-react"
import { useSWRConfig } from "swr"
const { GITHUB_CLIENT_ID } = import.meta.env

// https://docs.github.com/en/developers/apps/building-oauth-apps/scopes-for-oauth-apps
const SCOPES = ["public_repo"]

const LOGIN_URL = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=${SCOPES.join("%20")}`

export default function GitHubLoginButton() {
    const { mutate } = useSWRConfig()

    const showLoginWindow = (evt: MouseEvent) => {
        const win = window.open(LOGIN_URL, "Sign in with GitHub", "resizable,scrollbars,status")
        evt.preventDefault()

        win.addEventListener("close", () => {
            mutate("/user")
        })
    }

    if (GITHUB_CLIENT_ID) {
        return <a
            class="button"
            href={LOGIN_URL}
            target="_blank"
            rel="noreferrer"
            onClick={showLoginWindow}
        >
            <MarkGithubIcon size={16} /> Sign in with GitHub
        </a>
    } else {
        // The backend is not configured to support GitHub login
        return <button disabled>
            GitHub sign-in not configured
        </button>
    }
}
