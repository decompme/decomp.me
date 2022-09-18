import { useState, useCallback, useEffect } from "react"

import { useRouter } from "next/router"

import { usePlausible } from "next-plausible"
import useSWR, { Revalidator, RevalidatorOptions, mutate } from "swr"
import { useDebouncedCallback } from "use-debounce"

import { ignoreNextWarnBeforeUnload } from "./hooks"

const API_BASE = process.env.INTERNAL_API_BASE ?? process.env.NEXT_PUBLIC_API_BASE

type Json = any

const commonOpts: RequestInit = {
    credentials: "include",
    cache: "reload",
    headers: {
        "Accept": "application/json",
    },
}

/*
function isAbsoluteUrl(maybeUrl: string): boolean {
    return maybeUrl.startsWith("https://") || maybeUrl.startsWith("http://")
}
*/

function onErrorRetry<C>(error: ResponseError, key: string, config: C, revalidate: Revalidator, { retryCount }: RevalidatorOptions) {
    if (error.status === 404) return
    if (retryCount >= 10) return

    // Retry after 5 seconds
    setTimeout(() => revalidate({ retryCount }), 5000)
}

function undefinedIfUnchanged<O, K extends keyof O>(saved: O, local: O, key: K): O[K] | undefined {
    if (saved[key] !== local[key]) {
        return local[key]
    }
}

export class ResponseError extends Error {
    status: number
    json: Json
    code: string

    constructor(response: Response, json) {
        super(`Server responded with HTTP status code ${response.status}`)

        this.status = response.status
        this.json = json
        this.code = json.code
        this.message = json?.detail
        this.name = "ResponseError"
    }
}

export function getURL(url: string) {
    if (url.startsWith("/")) {
        url = API_BASE + url
    }
    return url
}

export async function get(url: string, useCacheIfFresh = false) {
    url = getURL(url)

    const response = await fetch(url, {
        ...commonOpts,
        cache: useCacheIfFresh ? "default" : "no-cache",
    })

    if (!response.ok) {
        throw new ResponseError(response, await response.json())
    }

    try {
        return await response.json()
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new ResponseError(response, {
                code: "invalid_json",
                detail: "The server returned invalid JSON",
            })
        }

        throw error
    }
}

export const getCached = (url: string) => get(url, true)

export async function post(url: string, json: Json) {
    url = getURL(url)

    const body: string = JSON.stringify(json)

    console.info("POST", url, JSON.parse(body))

    const response = await fetch(url, {
        ...commonOpts,
        method: "POST",
        body,
        headers: {
            "Content-Type": "application/json",
        },
    })

    if (!response.ok) {
        throw new ResponseError(response, await response.json())
    }

    return await response.json()
}

export async function patch(url: string, json: Json) {
    url = getURL(url)

    const body = JSON.stringify(json)

    console.info("PATCH", url, JSON.parse(body))

    const response = await fetch(url, {
        ...commonOpts,
        method: "PATCH",
        body,
        headers: {
            "Content-Type": "application/json",
        },
    })

    if (!response.ok) {
        throw new ResponseError(response, await response.json())
    }

    const text = await response.text()
    if (!text) {
        return
    }
    return JSON.parse(text)
}

export async function delete_(url: string, json: Json) {
    url = getURL(url)

    const body: string = JSON.stringify(json)

    console.info("DELETE", url, JSON.parse(body))

    const response = await fetch(url, {
        ...commonOpts,
        method: "DELETE",
        body,
        headers: {
            "Content-Type": "application/json",
        },
    })

    if (!response.ok) {
        throw new ResponseError(response, await response.json())
    }

    if (response.status == 204) { // No Content
        return null
    } else {
        return await response.json()
    }
}

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
    username: string

    frog_color: [number, number, number]
}

export interface User {
    url: string
    html_url: string
    is_anonymous: false
    id: number
    is_online: boolean
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
    score: number // -1 = doesn't compile
    max_score: number
    project: string
    project_function: string
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
    repo: {
        html_url: string
        owner: string
        repo: string
        branch: string
        is_pulling: boolean
        last_pulled: string | null
    }
    creation_time: string
    icon_url: string
    members: User[]
    description: string
    most_common_platform?: string
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

export type Compilation = {
    errors: string
    diff_output: DiffOutput | null
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

export type CompilerPreset = {
    name: string
    flags: string
    compiler: string
    diff_flags: string[]
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

export function useThisUser(): User | AnonymousUser | undefined {
    const { data: user, error } = useSWR<AnonymousUser | User>("/user", get)

    if (error) {
        throw error
    }

    return user
}

export function isUserEq(a: User | AnonymousUser | undefined, b: User | AnonymousUser | undefined): boolean {
    return a && b && a.id === b.id && a.is_anonymous === b.is_anonymous
}

export function useUserIsYou(): (user: User | AnonymousUser | undefined) => boolean {
    const you = useThisUser()

    return useCallback(user => {
        return isUserEq(you, user)
    }, [you && you.id, you && you.is_anonymous]) // eslint-disable-line react-hooks/exhaustive-deps
}

export function useSavedScratch(scratch: Scratch): Scratch {
    const { data: savedScratch, error } = useSWR(scratch.url, get, {
        fallbackData: scratch, // No loading state, just use the local scratch
    })

    if (error)
        throw error

    return savedScratch
}

export function useSaveScratch(localScratch: Scratch): () => Promise<Scratch> {
    const savedScratch = useSavedScratch(localScratch)
    const userIsYou = useUserIsYou()
    const plausible = usePlausible()

    const saveScratch = useCallback(async () => {
        if (!localScratch) {
            throw new Error("Cannot save scratch before it is loaded")
        }
        if (!userIsYou(localScratch.owner)) {
            throw new Error("Cannot save scratch which you do not own")
        }

        const updatedScratch = await patch(localScratch.url, {
            source_code: undefinedIfUnchanged(savedScratch, localScratch, "source_code"),
            context: undefinedIfUnchanged(savedScratch, localScratch, "context"),
            compiler: undefinedIfUnchanged(savedScratch, localScratch, "compiler"),
            compiler_flags: undefinedIfUnchanged(savedScratch, localScratch, "compiler_flags"),
            diff_flags: undefinedIfUnchanged(savedScratch, localScratch, "diff_flags"),
            diff_label: undefinedIfUnchanged(savedScratch, localScratch, "diff_label"),
            preset: undefinedIfUnchanged(savedScratch, localScratch, "preset"),
            name: undefinedIfUnchanged(savedScratch, localScratch, "name"),
            description: undefinedIfUnchanged(savedScratch, localScratch, "description"),
        })

        await mutate(localScratch.url, updatedScratch, false)

        plausible("saveScratch", { props: { scratch: localScratch.html_url } })

        return updatedScratch
    }, [localScratch, plausible, savedScratch, userIsYou])

    return saveScratch
}

export async function claimScratch(scratch: Scratch): Promise<void> {
    const { success } = await post(`${scratch.url}/claim`, {})
    const user = await get("/user")

    if (!success)
        throw new Error("Scratch cannot be claimed")

    await mutate(scratch.url, {
        ...scratch,
        owner: user,
    })
}

export async function forkScratch(parent: TerseScratch): Promise<Scratch> {
    const scratch = await post(`${parent.url}/fork`, parent)
    await claimScratch(scratch)
    return scratch
}

export function useForkScratchAndGo(parent: TerseScratch): () => Promise<void> {
    const router = useRouter()
    const plausible = usePlausible()

    return useCallback(async () => {
        const fork = await forkScratch(parent)

        plausible("forkScratch", { props: { parent: parent.html_url, fork: fork.html_url } })

        ignoreNextWarnBeforeUnload()
        await router.push(fork.html_url)
    }, [parent, router, plausible])
}

export function useIsScratchSaved(scratch: Scratch): boolean {
    const saved = useSavedScratch(scratch)

    return (
        scratch.name === saved.name &&
        scratch.description === saved.description &&
        scratch.compiler === saved.compiler &&
        scratch.compiler_flags === saved.compiler_flags &&
        JSON.stringify(scratch.diff_flags) === JSON.stringify(saved.diff_flags) &&
        scratch.diff_label === saved.diff_label &&
        scratch.source_code === saved.source_code &&
        scratch.context === saved.context
    )
}

export function useCompilation(scratch: Scratch | null, autoRecompile = true, autoRecompileDelay, initial = null): {
    compilation: Readonly<Compilation> | null
    compile: () => Promise<void> // no debounce
    debouncedCompile: () => Promise<void> // with debounce
    isCompiling: boolean
    isCompilationOld: boolean
} {
    const savedScratch = useSavedScratch(scratch)
    const [compileRequestPromise, setCompileRequestPromise] = useState<Promise<void>>(null)
    const [compilation, setCompilation] = useState<Compilation>(initial)
    const plausible = usePlausible()
    const [isCompilationOld, setIsCompilationOld] = useState(false)

    const compile = useCallback(() => {
        if (compileRequestPromise)
            return compileRequestPromise

        if (!scratch)
            return Promise.reject(new Error("Cannot compile without a scratch"))

        if (!scratch.compiler)
            return Promise.reject(new Error("Cannot compile before a compiler is set"))

        const promise = post(`${scratch.url}/compile`, {
            // TODO: api should take { scratch } and support undefinedIfUnchanged on all fields
            compiler: scratch.compiler,
            compiler_flags: scratch.compiler_flags,
            diff_flags: scratch.diff_flags,
            diff_label: scratch.diff_label,
            source_code: scratch.source_code,
            context: savedScratch ? undefinedIfUnchanged(savedScratch, scratch, "context") : scratch.context,
        }).then((compilation: Compilation) => {
            setCompilation(compilation)
        }).finally(() => {
            setCompileRequestPromise(null)
            setIsCompilationOld(false)
        }).catch(error => {
            setCompilation({ "errors": error.json?.detail, "diff_output": null })
        })

        setCompileRequestPromise(promise)

        plausible("compileScratch", { props: { auto: autoRecompile, scratch: scratch.html_url } })

        return promise
    }, [autoRecompile, compileRequestPromise, plausible, savedScratch, scratch])

    // If the scratch we're looking at changes, we need to recompile
    const [url, setUrl] = useState(scratch.url)
    useEffect(() => {
        if (url !== scratch.url) {
            setUrl(scratch.url)
            compile()
        }
    }, [compile, scratch.url, url])

    const debouncedCompile = useDebouncedCallback(compile, autoRecompileDelay, { leading: false, trailing: true })

    useEffect(() => {
        if (!compilation) {
            compile()
        } else {
            setIsCompilationOld(true)

            if (autoRecompile) {
                if (scratch && scratch.compiler !== "") {
                    debouncedCompile()
                } else {
                    setCompilation(null)
                }
            }
        }
    }, [ // eslint-disable-line react-hooks/exhaustive-deps
        debouncedCompile,
        autoRecompile,

        // fields passed to compilations
        scratch.compiler,
        scratch.compiler_flags, scratch.diff_flags, scratch.diff_label,
        scratch.source_code, scratch.context,
    ])

    return {
        compilation,
        compile,
        debouncedCompile,
        isCompiling: !!compileRequestPromise,
        isCompilationOld,
    }
}

export function usePlatforms(): Record<string, Platform> {
    const { data } = useSWR<{ "platforms": Record<string, Platform> }>("/compilers", getCached, {
        refreshInterval: 0,
        revalidateOnFocus: false,
        suspense: true, // TODO: remove
        onErrorRetry,
    })

    return data?.platforms
}

export function useCompilers(): Record<string, Compiler> {
    const { data } = useSWR("/compilers", get, {
        refreshInterval: 0,
        suspense: true, // TODO: remove
        onErrorRetry,
    })

    return data.compilers
}

export function usePaginated<T>(url: string, firstPage?: Page<T>): {
    results: T[]
    hasNext: boolean
    hasPrevious: boolean
    isLoading: boolean
    loadNext: () => Promise<void>
    loadPrevious: () => Promise<void>
} {
    const [results, setResults] = useState<T[]>(firstPage?.results ?? [])
    const [next, setNext] = useState<string | null>(firstPage?.next)
    const [previous, setPrevious] = useState<string | null>(firstPage?.previous)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (!firstPage) {
            setResults([])
            setNext(url)
            setPrevious(null)
            setIsLoading(true)

            get(url).then((page: Page<T>) => {
                setResults(page.results)
                setNext(page.next)
                setPrevious(page.previous)
                setIsLoading(false)
            })
        }
    }, [url]) // eslint-disable-line react-hooks/exhaustive-deps

    const loadNext = useCallback(async () => {
        if (!next)
            throw new Error("No more")

        setIsLoading(true)

        const data: Page<T> = await get(next)
        setResults(results => [...results, ...data.results])
        setNext(data.next)
        setIsLoading(false)
    }, [next])

    const loadPrevious = useCallback(async () => {
        if (!previous)
            throw new Error("No more")

        setIsLoading(true)

        const data: Page<T> = await get(previous)
        setResults(results => [...data.results, ...results])
        setPrevious(data.previous)
        setIsLoading(false)
    }, [previous])

    return {
        results,
        hasNext: !!next,
        hasPrevious: !!previous,
        isLoading,
        loadNext,
        loadPrevious,
    }
}

export interface Stats {
    asm_count: number
    scratch_count: number
    github_user_count: number
    profile_count: number
}

export function useStats(): Stats | undefined {
    const { data, error } = useSWR<Stats>("/stats", get, {
        refreshInterval: 5000,
    })

    if (error) {
        throw error
    }

    return data
}
