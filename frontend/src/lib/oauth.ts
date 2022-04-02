import { mutate } from "swr"

import { ResponseError } from "./api"

const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID

export function isGitHubLoginSupported(): boolean {
    return !!GITHUB_CLIENT_ID
}

// https://docs.github.com/en/developers/apps/building-oauth-apps/scopes-for-oauth-apps
export function showGitHubLoginWindow(popup: boolean, scope: string) {
    const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=${encodeURIComponent(scope)}`
    const win = popup && window.open(url, "Sign in with GitHub", "popup,width=520,height=400,resizable,status")

    if (win) {
        win.addEventListener("message", event => {
            if (event.data?.source === "decomp_me_login") {
                console.info("Got new user from popup", event.data.user)
                mutate("/user", event.data.user)
            }
        })
    } else {
        window.location.href = url
    }
}

export async function requestMissingScopes<T>(makeRequest: () => Promise<T>): Promise<T> {
    try {
        return await makeRequest()
    } catch (error) {
        if (error instanceof ResponseError && error.json.kind == "MissingOAuthScopeException") {
            const scope = error.json.detail

            console.warn("Missing scopes", scope)
            showGitHubLoginWindow(true, scope)

            return await requestMissingScopes(makeRequest)
        } else {
            throw error
        }
    }
}
