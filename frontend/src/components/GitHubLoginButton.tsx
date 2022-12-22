"use client"

import { MarkGithubIcon } from "@primer/octicons-react"

import { isAnonUser, useThisUser } from "@/lib/api"
import { isGitHubLoginSupported, showGitHubLoginWindow } from "@/lib/oauth"

import Button from "./Button"

const DEFAULT_SCOPE_STR = ""

export default function GitHubLoginButton({ label, popup, className }: { label?: string, popup: boolean, className?: string }) {
    const user = useThisUser()

    if (user && !isAnonUser(user)) {
        // We're already logged in
        return null
    }

    if (isGitHubLoginSupported()) {
        return <Button className={className} onClick={() => showGitHubLoginWindow(popup, DEFAULT_SCOPE_STR)}>
            <MarkGithubIcon size={16} /> {label ?? "Sign in with GitHub"}
        </Button>
    } else {
        // The backend is not configured to support GitHub login
        return <Button className={className} onClick={() => {}} disabled>
            <MarkGithubIcon size={16} /> Unavailable
        </Button>
    }
}
