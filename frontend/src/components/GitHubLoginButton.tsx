import { MarkGithubIcon } from "@primer/octicons-react"

import { isGitHubLoginSupported, showGitHubLoginWindow } from "../lib/oauth"

import Button from "./Button"

export default function GitHubLoginButton({ label, popup, className }: { label?: string, popup: boolean, className?: string }) {
    if (isGitHubLoginSupported()) {
        return <Button className={className} onClick={() => showGitHubLoginWindow(popup, "")}>
            <MarkGithubIcon size={16} /> {label ?? "Sign in with GitHub"}
        </Button>
    } else {
        // The backend is not configured to support GitHub login
        return <Button className={className} onClick={() => {}} disabled>
            <MarkGithubIcon size={16} /> Unavailable
        </Button>
    }
}
