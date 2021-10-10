import { useState, useCallback, useEffect } from "react"

import { useRouter } from "next/router"

import { dequal } from "dequal/lite"
import useSWR, { Revalidator, RevalidatorOptions } from "swr"
import { useDebouncedCallback } from "use-debounce"
import useDeepCompareEffect from "use-deep-compare-effect"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE

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
    is_you: boolean,
    is_anonymous: true,
}

export interface User {
    is_you: boolean,
    is_anonymous: false,

    id: number,
    username: string,
    name: string,
    avatar_url: string | null,
    github_api_url: string | null,
    github_html_url: string | null,
}

export type Scratch = {
    slug: string,
    compiler: string,
    cc_opts: string,
    source_code: string,
    context: string,
    owner: AnonymousUser | User | null,
    parent: string | null, // URL
    diff_label: string | null,
}

export type Compilation = {
    errors: string,
    diff_output: DiffOutput,
}

export type DiffOutput = {
    arch_str: string,
    current_score: number,
    error: string | null,
    header: DiffHeader,
    rows: DiffRow[],
}

export type DiffHeader = {
    base: DiffText[],
    current: DiffText[],
    previous?: DiffText[],
}

export type DiffRow = {
    key: string,
    base?: DiffCell,
    current?: DiffCell,
    previous?: DiffCell,
}

export type DiffCell = {
    text: DiffText[],
    line?: number,
    branch?: number,
    src?: string,
    src_comment?: string,
    src_line?: number,
    src_path?: string,
}

export type DiffText = {
    text: string,
    format?: string,
    group?: string,
    index?: number,
    key?: string,
}


export function isAnonUser(user: User | AnonymousUser): user is AnonymousUser {
    return user.is_anonymous
}

export function useScratch(slugOrUrlOrInitialValue: string | Scratch): {
    scratch: Readonly<Scratch> | null,
    savedScratch: Readonly<Scratch> | null,
    setScratch: (scratch: Partial<Scratch>) => void, // Update the scratch, but only locally
    saveScratch: () => Promise<void>, // Persist the scratch to the server
    version: number, // Increases when different data is loaded from the server
    isLoading: boolean,
    isSaved: boolean,
    error: ResponseError | null,
} {
    let initialValue = null
    if (typeof slugOrUrlOrInitialValue === "object") {
        initialValue = slugOrUrlOrInitialValue
        slugOrUrlOrInitialValue = slugOrUrlOrInitialValue.slug
    }

    if (!isAbsoluteUrl(slugOrUrlOrInitialValue)) {
        slugOrUrlOrInitialValue = `/scratch/${slugOrUrlOrInitialValue}`
    }

    const [isSaved, setIsSaved] = useState(true)
    const [version, setVersion] = useState(0)
    const [localScratch, setLocalScratch] = useState<Scratch | null>(initialValue)
    const { data, error, mutate } = useSWR<Scratch, ResponseError>(slugOrUrlOrInitialValue, get, {
        refreshInterval: isSaved ? 5000 : 0,
        onSuccess: scratch => {
            if (!scratch.source_code) {
                throw new Error("Scratch returned from API has no source_code (is the API misbehaving?)")
            }

            // Only update localScratch if there aren't unsaved changes (otherwise, data loss could occur)
            if (!localScratch || (isSaved && !dequal(scratch, localScratch))) {
                console.info("Got updated scratch from server", scratch)
                setLocalScratch(scratch)
                setVersion(version + 1)
            }
        },
        onErrorRetry,
    })
    const savedScratch = data || null

    // If the slug changes, forget the local scratch
    useEffect(() => {
        setLocalScratch(initialValue)
        mutate()
        setIsSaved(true)
    }, [initialValue, mutate])

    const setScratch = useCallback((partial: Partial<Scratch>) => {
        const scratch = Object.assign({}, localScratch, partial)

        setLocalScratch(scratch)
        setIsSaved(dequal(scratch, savedScratch))
    }, [localScratch, savedScratch])

    const saveScratch = useCallback(() => {
        if (!localScratch) {
            throw new Error("Cannot save scratch before it is loaded")
        }
        if (!localScratch.owner.is_you) {
            throw new Error("Cannot save scratch which you do not own")
        }

        return patch(`/scratch/${savedScratch.slug}`, {
            // TODO: api should support undefinedIfUnchanged on all fields
            source_code: localScratch.source_code,
            context: localScratch.context, //undefinedIfUnchanged("context"),
            compiler: localScratch.compiler,
            cc_opts: localScratch.cc_opts,
        }).then(() => {
            setIsSaved(true)
            mutate(localScratch, true)
        }).catch(error => {
            console.error(error)
        })
    }, [localScratch, savedScratch, mutate])

    return {
        scratch: localScratch,
        savedScratch,
        setScratch,
        saveScratch,
        isLoading: !data && !error,
        isSaved,
        version,
        error,
    }
}

export async function forkScratch(parent: Scratch): Promise<Scratch> {
    const scratch = await post(`/scratch/${parent.slug}/fork`, parent)
    return scratch
}

export function useForkScratchAndGo(parent: Scratch): () => Promise<void> {
    const router = useRouter()

    return async () => {
        const fork = await forkScratch(parent)
        router.push(`/scratch/${fork.slug}`)
    }
}

export function useCompilation(scratch: Scratch | null, savedScratch?: Scratch, autoRecompile = true): {
    compilation: Readonly<Compilation> | null,
    compile: () => Promise<void>, // no debounce
    debouncedCompile: () => Promise<void>, // with debounce
    isCompiling: boolean,
    error: ResponseError | null,
} {
    const [isCompileRequestPending, setIsCompileRequestPending] = useState(false)
    const [compilation, setCompilation] = useState<Compilation>(null)
    const [error, setError] = useState<ResponseError>(null)

    const compile = useCallback(() => {
        if (!scratch) {
            return
        }

        setIsCompileRequestPending(true)

        return post(`/scratch/${scratch.slug}/compile`, {
            // TODO: api should take { scratch } and support undefinedIfUnchanged on all fields
            compiler: scratch.compiler,
            cc_opts: scratch.cc_opts,
            source_code: scratch.source_code,
            context: savedScratch ? undefinedIfUnchanged(savedScratch, scratch, "context") : scratch.context,
        }).then((compilation: Compilation) => {
            setCompilation(compilation)
        }).catch((error: ResponseError) => {
            setError(error)
            return Promise.reject(error)
        }).finally(() => {
            setIsCompileRequestPending(false)
        })
    }, [savedScratch, scratch])

    const debouncedCompile = useDebouncedCallback(compile, 500, { leading: false, trailing: true })

    useDeepCompareEffect(() => {
        if (autoRecompile) {
            if (scratch && scratch.compiler !== "")
                debouncedCompile()
            else
                setCompilation(null)
        }
    }, [debouncedCompile, scratch, autoRecompile])

    return {
        compilation,
        compile,
        debouncedCompile,
        isCompiling: isCompileRequestPending || debouncedCompile.isPending(),
        error,
    }
}

export function useArches(): Record<string, string> {
    const { data, error } = useSWR<{ "arches": Record<string, string> }, ResponseError>("/compilers", getCached, {
        refreshInterval: 0,
        revalidateOnFocus: false,
        onErrorRetry,
    })

    if (error) {
        console.error("useArches error", error)
    }

    return data?.arches || {
        "mips": "MIPS (Nintendo 64)",
    }
}

export function useCompilers(): Record<string, { arch: string | null }> {
    const { data, error } = useSWR("/compilers", getCached, {
        refreshInterval: 0,
        revalidateOnFocus: false,
        onErrorRetry,
    })

    if (error) {
        console.error("useCompilers error", error)
    }

    return data?.compilers || {
        "gcc2.8.1": { "arch": "mips" },
    }
}
