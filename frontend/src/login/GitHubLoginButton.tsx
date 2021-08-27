import { h, Fragment } from "preact"
import { MarkGithubIcon } from "@primer/octicons-react"
const { GITHUB_CLIENT_ID } = import.meta.env

// https://docs.github.com/en/developers/apps/building-oauth-apps/scopes-for-oauth-apps
const SCOPES = ["public_repo"]

const LOGIN_URL = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=${SCOPES.join('%20')}`

export default function GitHubLoginButton() {
    if (GITHUB_CLIENT_ID) {
        return <a class="button" href={LOGIN_URL}>
            <MarkGithubIcon size={16} /> Sign in with GitHub
        </a>
    } else {
        // The backend is not configured to support GitHub login
        return <button disabled>
            GitHub sign-in not configured
        </button>
    }
}
