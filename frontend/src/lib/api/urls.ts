import { Preset, Project, ProjectMember, TerseScratch, User } from "./types"

export function userHtmlUrl(user: User): string {
    return `/u/${user.username}`
}

export function userUrl(user: User): string {
    return `/users/${user.username}`
}

export function userAvatarUrl(user: User): string | null {
    return user.github_id && `https://avatars.githubusercontent.com/u/${user.github_id}?v=4`
}

// Although we technically only need the internal username, only return if we have a github id
export function userGithubHtmlUrl(user: User): string | null {
    return user.github_id && `https://github.com/${user.username}`
}

// Although we technically only need the internal username, only return if we have a github id
export function userGithubUrl(user: User): string | null {
    return user.github_id && `https://api.github.com/users/${user.username}`
}

export function presetUrl(preset: Preset): string {
    return `/preset/${preset.id}`
}

export function projectUrl(project: Project): string {
    return `/project/${project.slug}`
}

export function projectMemberUrl(project: Project, projectMember: ProjectMember): string {
    return `${projectUrl(project)}/members/${projectMember.username}`
}

export function scratchUrl(scratch: TerseScratch): string {
    return `/scratch/${scratch.slug}`
}

export function scratchParentUrl(scratch: TerseScratch): string {
    return `/scratch/${scratch.parent}`
}
