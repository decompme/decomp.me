import { useState, useCallback, useEffect } from "react"

import { useRouter } from "next/router"

import useSWR, { Revalidator, RevalidatorOptions } from "swr"
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

    constructor(response: Response, responseJSON) {
        super(`Server responded with HTTP status code ${response.status}`)

        this.status = response.status
        this.responseJSON = responseJSON

        if (responseJSON.error) {
            this.message = responseJSON.error
        } else if (responseJSON.detail) {
            this.message = responseJSON.detail
        } else if (responseJSON.errors) {
            this.message = responseJSON.errors.join(",")
        }

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
    arch: string
    cc_opts: string
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
    const shouldGetScratchFromServer = useCallback(() => {
        // This is in a useCallback so useSWR's onSuccess doesn't capture the values

        if (!localScratch)
            return true

        // Only update localScratch if there aren't unsaved changes (otherwise, data loss could occur)
        if (isSaved)
            return true

        return false
    }, [localScratch, isSaved])
    const { data, mutate } = useSWR<Scratch>(url, get, {
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
            }
        },
        onErrorRetry,
    })
    const savedScratch = data

    // If the slug changes, forget the local scratch
    useEffect(() => {
        setLocalScratch(undefined)
        mutate()
        setIsSaved(true)
    }, [slugOrUrl, mutate])

    const updateLocalScratch = useCallback((partial: Partial<Scratch>) => {
        setLocalScratch(Object.assign({}, localScratch, partial))
        setIsSaved(false)
    }, [localScratch])

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
            cc_opts: undefinedIfUnchanged(savedScratch, localScratch, "cc_opts"),
            name: undefinedIfUnchanged(savedScratch, localScratch, "name"),
            description: undefinedIfUnchanged(savedScratch, localScratch, "description"),
        }).then(() => {
            setIsSaved(true)
            mutate(localScratch, true)
        }).catch(error => {
            console.error(error)
        })
    }, [localScratch, savedScratch, mutate])

    if (!localScratch) {
        setIsSaved(true)
        setLocalScratch(savedScratch)
    }

    return {
        scratch: localScratch ?? savedScratch,
        savedScratch,
        setScratch: updateLocalScratch,
        saveScratch,
        isSaved,
    }
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

export function useCompilation(scratch: Scratch | null, savedScratch?: Scratch, autoRecompile = true): {
    compilation: Readonly<Compilation> | null
    compile: () => Promise<void> // no debounce
    debouncedCompile: () => Promise<void> // with debounce
    isCompiling: boolean
} {
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
            cc_opts: scratch.cc_opts,
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

    // suspense
    if (!compilation && compileRequestPromise) {
        throw compileRequestPromise
    }

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
        scratch.compiler, scratch.cc_opts,
        scratch.source_code, scratch.context,
    ])

    return {
        compilation,
        compile,
        debouncedCompile,
        isCompiling: !!compileRequestPromise || debouncedCompile.isPending(),
    }
}

export function useArches(): Record<string, string> {
    const { data } = useSWR<{ "arches": Record<string, string> }>("/compilers", getCached, {
        refreshInterval: 0,
        revalidateOnFocus: false,
        suspense: true,
        onErrorRetry,
    })

    return data?.arches
}

export function useCompilers(): Record<string, { arch: string | null }> {
    const { data } = useSWR("/compilers", get, {
        refreshInterval: 0,
        suspense: true,
        onErrorRetry,
    })

    return data.compilers
}
