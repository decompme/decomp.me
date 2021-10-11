import { MarkGithubIcon } from "@primer/octicons-react"
import { useSWRConfig } from "swr"

import Button from "./Button"

const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ?? process.env.STORYBOOK_GITHUB_CLIENT_ID

// https://docs.github.com/en/developers/apps/building-oauth-apps/scopes-for-oauth-apps
const SCOPES = ["public_repo"]

const LOGIN_URL = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=${SCOPES.join("%20")}`

export default function GitHubLoginButton({ label }: { label?: string }) {
    const { mutate } = useSWRConfig()

    const showLoginWindow = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        const win = window.open(LOGIN_URL, "Sign in with GitHub", "resizable,scrollbars,status")
        event.preventDefault()

        win.addEventListener("close", () => {
            mutate("/user")
        })
    }

    if (GITHUB_CLIENT_ID) {
        return <Button onClick={showLoginWindow}>
            <MarkGithubIcon size={16} /> {label ?? "Sign in with GitHub"}
        </Button>
    } else {
        // The backend is not configured to support GitHub login
        return <button disabled>
            GitHub sign-in not configured
        </button>
    }
}
