import { MarkGithubIcon } from "@primer/octicons-react"
import { useSWRConfig } from "swr"

import Button from "./Button"

const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ?? process.env.STORYBOOK_GITHUB_CLIENT_ID

// https://docs.github.com/en/developers/apps/building-oauth-apps/scopes-for-oauth-apps
const SCOPES = ["public_repo"]

const LOGIN_URL = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=${SCOPES.join("%20")}`

export default function GitHubLoginButton({ label, popup, className }: { label?: string, popup: boolean, className?: string }) {
    const { mutate } = useSWRConfig()

    const showLoginWindow = () => {
        const win = popup && window.open(LOGIN_URL, "Sign in with GitHub", "popup,width=520,height=400,resizable,status")

        if (win) {
            win.addEventListener("message", event => {
                if (event.data?.source === "decomp_me_login") {
                    console.info("Got new user from popup", event.data.user)
                    mutate("/user", event.data.user)
                }
            })
        } else {
            console.warn("Login popup was blocked")
            window.location.href = LOGIN_URL
        }
    }

    if (GITHUB_CLIENT_ID) {
        return <Button className={className} onClick={showLoginWindow}>
            <MarkGithubIcon size={16} /> {label ?? "Sign in with GitHub"}
        </Button>
    } else {
        // The backend is not configured to support GitHub login
        return <Button className={className} onClick={() => {}} disabled>
            <MarkGithubIcon size={16} /> Unavailable
        </Button>
    }
}
