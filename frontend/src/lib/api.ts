import { useState, useCallback, useEffect } from "react"

import { useRouter } from "next/router"

import useSWR, { Revalidator, RevalidatorOptions, mutate } from "swr"
import { useDebouncedCallback } from "use-debounce"

const API_BASE = process.env.INTERNAL_API_BASE ?? process.env.NEXT_PUBLIC_API_BASE ?? process.env.STORYBOOK_API_BASE

type Json = Record<string, unknown>

const commonOpts: RequestInit = {
    credentials: "include",
    cache: "reload",
}

function isAbsoluteUrl(maybeUrl: string): boolean {
    return maybeUrl.startsWith("https://") || maybeUrl.startsWith("http://")
}

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
    responseJSON: Json
    code: string

    constructor(response: Response, responseJSON) {
        super(`Server responded with HTTP status code ${response.status}`)

        this.status = response.status
        this.responseJSON = responseJSON
        this.code = responseJSON.code
        this.message = responseJSON.detail
        this.name = "ResponseError"
    }
}

export async function get(url: string, useCacheIfFresh = false) {
    if (url.startsWith("/")) {
        url = API_BASE + url
    }

    const response = await fetch(url, {
        ...commonOpts,
        cache: useCacheIfFresh ? "default" : "no-cache",
    })

    if (!response.ok) {
        throw new ResponseError(response, await response.json())
    }

    return await response.json()
}

export const getCached = (url: string) => get(url, true)

export async function post(url: string, json: Json) {
    if (url.startsWith("/")) {
        url = API_BASE + url
    }

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
    if (url.startsWith("/")) {
        url = API_BASE + url
    }

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

export interface AnonymousUser {
    is_you: boolean
    is_anonymous: true
}

export interface User {
    is_you: boolean
    is_anonymous: false

    id: number
    username: string
    name: string
    avatar_url: string | null
    github_api_url: string | null
    github_html_url: string | null
}

export type Scratch = {
    name: string
    description: string
    slug: string
    compiler: string
    platform: string
    compiler_flags: string
    source_code: string
    context: string
    owner: AnonymousUser | User | null // null means unclaimed
    parent: string | null // URL
    diff_label: string | null
    score: number // -1 = doesn't compile
}

export type Compilation = {
    errors: string
    diff_output: DiffOutput
}

export type DiffOutput = {
    arch_str: string
    current_score: number
    max_score: number
    error: string | null
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


export function isAnonUser(user: User | AnonymousUser): user is AnonymousUser {
    return user.is_anonymous
}

export function useScratch(slugOrUrl: string): {
    scratch: Readonly<Scratch>
    savedScratch: Readonly<Scratch> | null
    setScratch: (scratch: Partial<Scratch>) => void // Update the scratch, but only locally
    saveScratch: () => Promise<void> // Persist the scratch to the server
    isSaved: boolean
} {
    const url = isAbsoluteUrl(slugOrUrl) ?slugOrUrl : `/scratch/${slugOrUrl}`
    const [isSaved, setIsSaved] = useState(true)
    const [localScratch, setLocalScratch] = useState<Scratch>()
    const [didSlugChange, setDidSlugChange] = useState(false)
    const shouldGetScratchFromServer = useCallback(() => {
        // This is in a useCallback so useSWR's onSuccess doesn't capture the values

        if (didSlugChange)
            return true

        // Only update localScratch if there aren't unsaved changes (otherwise, data loss could occur)
        if (isSaved)
            return true

        return false
    }, [didSlugChange, isSaved])
    const { data: savedScratch, mutate } = useSWR<Scratch>(url, get, {
        suspense: true,
        refreshInterval: 5000,
        onSuccess: scratch => {
            if (!scratch.source_code) {
                throw new Error("Scratch returned from API has no source_code (is the API misbehaving?)")
            }

            if (shouldGetScratchFromServer()) {
                console.info("Got updated scratch from server", scratch)
                setLocalScratch(scratch)
                setIsSaved(true)
                setDidSlugChange(false)
            }
        },
        onErrorRetry,
    })

    // If the slug changes, forget the local scratch
    useEffect(() => {
        setDidSlugChange(true)
        setLocalScratch(undefined)
        setIsSaved(true)
        mutate()
    }, [url, mutate])

    const updateLocalScratch = useCallback((partial: Partial<Scratch>) => {
        setLocalScratch((previous: Scratch) => Object.assign({}, savedScratch, previous, partial))
        setIsSaved(false)
    }, [savedScratch])

    const saveScratch = useCallback(() => {
        if (!localScratch) {
            throw new Error("Cannot save scratch before it is loaded")
        }
        if (!localScratch.owner.is_you) {
            throw new Error("Cannot save scratch which you do not own")
        }

        return patch(`/scratch/${savedScratch.slug}`, {
            source_code: undefinedIfUnchanged(savedScratch, localScratch, "source_code"),
            context: undefinedIfUnchanged(savedScratch, localScratch, "context"),
            compiler: undefinedIfUnchanged(savedScratch, localScratch, "compiler"),
            compiler_flags: undefinedIfUnchanged(savedScratch, localScratch, "compiler_flags"),
            name: undefinedIfUnchanged(savedScratch, localScratch, "name"),
            description: undefinedIfUnchanged(savedScratch, localScratch, "description"),
        }).then(() => {
            setIsSaved(true)
            mutate(localScratch, true)
        }).catch(error => {
            console.error(error)
        })
    }, [localScratch, savedScratch, mutate])

    return {
        scratch: isSaved ? savedScratch : localScratch,
        savedScratch,
        setScratch: updateLocalScratch,
        saveScratch,
        isSaved,
    }
}

export function useSavedScratch(scratch: Scratch): Scratch {
    const { data: savedScratch, error } = useSWR(`/scratch/${scratch.slug}`, get, {
        fallbackData: scratch, // No loading state, just use the local scratch
    })

    if (error)
        throw error

    return savedScratch
}

export function useSaveScratch(localScratch: Scratch): () => Promise<void> {
    const slug = localScratch.slug
    const savedScratch = useSavedScratch(localScratch)

    const saveScratch = useCallback(async () => {
        if (!localScratch) {
            throw new Error("Cannot save scratch before it is loaded")
        }
        if (!localScratch.owner.is_you) {
            throw new Error("Cannot save scratch which you do not own")
        }

        await patch(`/scratch/${slug}`, {
            source_code: undefinedIfUnchanged(savedScratch, localScratch, "source_code"),
            context: undefinedIfUnchanged(savedScratch, localScratch, "context"),
            compiler: undefinedIfUnchanged(savedScratch, localScratch, "compiler"),
            compiler_flags: undefinedIfUnchanged(savedScratch, localScratch, "compiler_flags"),
            name: undefinedIfUnchanged(savedScratch, localScratch, "name"),
            description: undefinedIfUnchanged(savedScratch, localScratch, "description"),
        })

        await mutate(`/scratch/${slug}`, localScratch, true)
    }, [localScratch, slug, savedScratch])

    return saveScratch
}

export async function forkScratch(parent: Scratch, localScratch: Partial<Scratch> = {}): Promise<Scratch> {
    const scratch = await post(`/scratch/${parent.slug}/fork`, Object.assign({}, parent, localScratch))
    return scratch
}

export function useForkScratchAndGo(parent: Scratch, localScratch: Partial<Scratch> = {}): () => Promise<void> {
    const router = useRouter()

    return async () => {
        const fork = await forkScratch(parent, localScratch)
        router.push(`/scratch/${fork.slug}`)
    }
}

export function useIsScratchSaved(scratch: Scratch): boolean {
    const saved = useSavedScratch(scratch)

    return (
        scratch.name === saved.name &&
        scratch.description === saved.description &&
        scratch.compiler === saved.compiler &&
        scratch.compiler_flags === saved.compiler_flags &&
        scratch.source_code === saved.source_code &&
        scratch.context === saved.context
    )
}

export function useCompilation(scratch: Scratch | null, autoRecompile = true): {
    compilation: Readonly<Compilation> | null
    compile: () => Promise<void> // no debounce
    debouncedCompile: () => Promise<void> // with debounce
    isCompiling: boolean
} {
    const savedScratch = useSavedScratch(scratch)
    const [compileRequestPromise, setCompileRequestPromise] = useState<Promise<void>>(null)
    const [compilation, setCompilation] = useState<Compilation>(null)

    const compile = useCallback(() => {
        if (compileRequestPromise)
            return compileRequestPromise

        if (!scratch)
            return Promise.reject(new Error("Cannot compile without a scratch"))

        if (!scratch.compiler)
            return Promise.reject(new Error("Cannot compile before a compiler is set"))

        const promise = post(`/scratch/${scratch.slug}/compile`, {
            // TODO: api should take { scratch } and support undefinedIfUnchanged on all fields
            compiler: scratch.compiler,
            compiler_flags: scratch.compiler_flags,
            source_code: scratch.source_code,
            context: savedScratch ? undefinedIfUnchanged(savedScratch, scratch, "context") : scratch.context,
        }).then((compilation: Compilation) => {
            setCompilation(compilation)
        }).finally(() => {
            setCompileRequestPromise(null)
        })

        setCompileRequestPromise(promise)

        return promise
    }, [compileRequestPromise, savedScratch, scratch])

    const debouncedCompile = useDebouncedCallback(compile, 500, { leading: false, trailing: true })

    useEffect(() => {
        if (autoRecompile) {
            if (scratch && scratch.compiler !== "")
                debouncedCompile()
            else
                setCompilation(null)
        }
    }, [ // eslint-disable-line react-hooks/exhaustive-deps
        debouncedCompile,
        autoRecompile,

        // fields passed to compilations
        scratch.compiler, scratch.compiler_flags,
        scratch.source_code, scratch.context,
    ])

    return {
        compilation,
        compile,
        debouncedCompile,
        isCompiling: !!compileRequestPromise || debouncedCompile.isPending(),
    }
}

export function usePlatforms(): Record<string, string> {
    const { data } = useSWR<{ "platforms": Record<string, string> }>("/compilers", getCached, {
        refreshInterval: 0,
        revalidateOnFocus: false,
        suspense: true,
        onErrorRetry,
    })

    return data?.platforms
}

export function useCompilers(): Record<string, { platform: string | null }> {
    const { data } = useSWR("/compilers", get, {
        refreshInterval: 0,
        suspense: true,
        onErrorRetry,
    })

    return data.compilers
}
