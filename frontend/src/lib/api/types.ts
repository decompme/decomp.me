export interface Page<T> {
    next: string | null
    previous: string | null
    results: T[]
}

export interface AnonymousUser {
    url: null
    html_url: null
    is_anonymous: true
    id: number
    is_online: boolean
    is_admin: boolean
    username: string

    frog_color: [number, number, number]
}

export interface User {
    url: string
    html_url: string
    is_anonymous: false
    id: number
    is_online: boolean
    is_admin: boolean
    username: string

    name: string
    avatar_url: string | null
    github_api_url: string | null
    github_html_url: string | null
}

export interface TerseScratch {
    url: string
    html_url: string
    slug: string
    owner: AnonymousUser | User | null // null = unclaimed
    parent: string | null
    name: string
    creation_time: string
    last_updated: string
    compiler: string
    platform: string
    language: string
    score: number // -1 = doesn't compile
    max_score: number
    match_override: boolean
    project: string
    project_function: string
    libraries: Library[]
}

export interface Scratch extends TerseScratch {
    description: string
    compiler_flags: string
    diff_flags: string[]
    preset: string
    source_code: string
    context: string
    diff_label: string
}

export interface Project {
    slug: string
    url: string
    html_url: string
    creation_time: string
    icon?: string
    description: string
    platform?: string
    unmatched_function_count: number
}

export interface ProjectFunction {
    url: string
    html_url: string
    project: string
    rom_address: number
    creation_time: string
    display_name: string
    is_matched_in_repo: boolean
    src_file: string
    asm_file: string
    attempts_count: number
}

export interface ProjectMember {
    url: string
    username: string
}

export type Compilation = {
    compiler_output: string
    diff_output: DiffOutput | null
    success: boolean
}

export type DiffOutput = {
    arch_str: string
    current_score: number
    max_score: number
    header: DiffHeader
    rows: DiffRow[]
}

export type DiffHeader = {
    base: DiffText[]
    current: DiffText[]
    previous?: DiffText[]
}

export type DiffRow = {
    key: string
    base?: DiffCell
    current?: DiffCell
    previous?: DiffCell
}

export type DiffCell = {
    text: DiffText[]
    line?: number
    branch?: number
    src?: string
    src_comment?: string
    src_line?: number
    src_path?: string
}

export type DiffText = {
    text: string
    format?: string
    group?: string
    index?: number
    key?: string
}

export type Flag = {
    type: "checkbox"
    id: string
    flag: string
} | {
    type: "flagset"
    id: string
    flags: string[]
}

export type Library = {
    name: string
    version: string
}

export type LibraryVersions = {
    name: string
    supported_versions: string[]
}

export type CompilerPreset = {
    name: string
    flags: string
    compiler: string
    diff_flags: string[]
    libraries: Library[]
}

export type Compiler = {
    platform: string
    flags: Flag[]
    diff_flags: Flag[]
}

export type Platform = {
    name: string
    description: string
    arch: string
    presets: CompilerPreset[]
}

export function isAnonUser(user: User | AnonymousUser): user is AnonymousUser {
    return user.is_anonymous
}
