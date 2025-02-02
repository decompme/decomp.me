import { ResponseError } from "./api";

const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;

export function isGitHubLoginSupported(): boolean {
    return !!GITHUB_CLIENT_ID;
}

// https://docs.github.com/en/developers/apps/building-oauth-apps/scopes-for-oauth-apps
export function showGitHubLoginWindow(scope: string) {
    const redirect_uri = `${window.location.origin}/login?redirect=${window.location.href}`
    const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirect_uri)}`;
    window.location.href = url;
}

export async function requestMissingScopes<T>(
    makeRequest: () => Promise<T>,
): Promise<T> {
    try {
        return await makeRequest();
    } catch (error) {
        if (
            error instanceof ResponseError &&
            error.json.kind === "MissingOAuthScopeException"
        ) {
            const scope = error.json.detail;

            console.warn("Missing scopes", scope);
            showGitHubLoginWindow(scope);

            throw new Error("Accept permissions and retry");
        } else {
            throw error;
        }
    }
}
