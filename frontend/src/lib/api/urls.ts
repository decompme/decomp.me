import type { Preset, TerseScratch, User } from "./types"

export function userHtmlUrl(user: User): string {
    return `/u/${user.username}`
}

export function userUrl(user: User): string {
    return `/users/${user.username}`
}

export function userAvatarUrl(user: User): string | null {
    return user.github_id && `https://avatars.githubusercontent.com/u/${user.github_id}`
}

// Only returns a URL if the user has a GitHub ID
export function userGithubHtmlUrl(user: User): string | null {
    return user.github_id && `https://github.com/${user.username}`
}

export function presetUrl(preset: Preset): string {
    return `/preset/${preset.id}`
}

export function platformUrl(platform: string): string {
    return `/platform/${platform}`
}

export function scratchUrl(scratch: TerseScratch): string {
    return `/scratch/${scratch.slug}`
}

export function scratchParentUrl(scratch: TerseScratch): string {
    return `/scratch/${scratch.parent}`
}
