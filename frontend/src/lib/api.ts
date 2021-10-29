import { useState, useCallback, useEffect } from "react"

import useSWR, { Revalidator, RevalidatorOptions } from "swr"
import { useDebouncedCallback } from "use-debounce"

import { get, post, patch } from "./apiRequest"
import ResponseError from "./ResponseError"

function onErrorRetry<C>(error: ResponseError, key: string, config: C, revalidate: Revalidator, { retryCount }: RevalidatorOptions) {
    if (error.status === 404) return
    if ((retryCount ?? 0) >= 10) return

    // Retry after 5 seconds
    setTimeout(() => revalidate({ retryCount }), 5000)
}

export function undefinedIfUnchanged<O, K extends keyof O>(saved: O, local: O, key: K): O[K] | undefined {
    if (saved[key] !== local[key]) {
        return local[key]
    }
}

export { get, post, patch } from "./apiRequest"

export const getCached = (url: string) => get(url, true)

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
    email: string
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

export function useScratch(slugOrFallbackData: string | Scratch): {
    scratch: Readonly<Scratch> | undefined
    save: (scratch: Scratch) => Promise<void>
    fork: (scratch: Scratch) => Promise<Scratch>
    claim: () => Promise<void>
} {
    const slug = typeof slugOrFallbackData === "string" ? slugOrFallbackData : slugOrFallbackData.slug
    const fallbackData = typeof slugOrFallbackData === "string" ? undefined : slugOrFallbackData

    const { data: serverScratch, mutate } = useSWR<Scratch>(`/scratch/${slug}`, getCached, {
        refreshInterval: 5000,
        fallbackData,
    })

    return {
        scratch: serverScratch,
        async save(scratch: Scratch) {
            if (!serverScratch)
                throw new Error("Cannot save scratch before it has been fetched")

            await patch(`/scratch/${slug}`, {
                source_code: undefinedIfUnchanged(serverScratch, scratch, "source_code"),
                context: undefinedIfUnchanged(serverScratch, scratch, "context"),
                compiler: undefinedIfUnchanged(serverScratch, scratch, "compiler"),
                compiler_flags: undefinedIfUnchanged(serverScratch, scratch, "compiler_flags"),
                name: undefinedIfUnchanged(serverScratch, scratch, "name"),
                description: undefinedIfUnchanged(serverScratch, scratch, "description"),
            })

            await mutate(scratch, true)
        },
        async fork(scratch?: Scratch): Promise<Scratch> {
            const data = scratch ? { ...scratch, ...serverScratch } : {}

            return await post(`/scratch/${slug}/fork`, data)
        },
        async claim() {
            const { success } = await post(`/scratch/${slug}/claim`, {})

            await mutate()

            if (!success)
                throw new Error("Scratch already claimed!")
        },
    }
}

export function useCompilation(scratch: Scratch | null, savedScratch?: Scratch, autoRecompile = true): {
    compilation: Readonly<Compilation> | undefined
    compile: () => Promise<void> // no debounce
    debouncedCompile: () => Promise<void> // with debounce
    isCompiling: boolean
} {
    const [compileRequestPromise, setCompileRequestPromise] = useState<Promise<void>>()
    const [compilation, setCompilation] = useState<Compilation>()

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
            setCompileRequestPromise(undefined)
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
                setCompilation(undefined)
        }
    }, [ // eslint-disable-line react-hooks/exhaustive-deps
        debouncedCompile,
        autoRecompile,

        // fields passed to compilations
        scratch?.compiler, scratch?.compiler_flags,
        scratch?.source_code, scratch?.context,
    ])

    return {
        compilation,
        compile,
        debouncedCompile: async () => debouncedCompile(),
        isCompiling: !!compileRequestPromise || debouncedCompile.isPending(),
    }
}

export function usePlatforms(): Record<string, string> {
    const { data } = useSWR<{ "platforms": Record<string, string> }>("/compilers", getCached, {
        refreshInterval: 0,
        revalidateOnFocus: false,
        fallbackData: { "platforms": {} },
        onErrorRetry,
    })

    return data ? data.platforms : {}
}

export function useCompilers(): Record<string, { platform: string | null }> {
    const { data } = useSWR("/compilers", get, {
        refreshInterval: 0,
        fallbackData: { "compilers": {} },
        onErrorRetry,
    })

    return data ? data.compilers : {}
}
