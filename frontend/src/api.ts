import { useState, useCallback, useEffect } from "preact/hooks"
import useSWR, { Revalidator, RevalidatorOptions } from "swr"
import { dequal } from "dequal/lite"
import { useHistory } from "react-router"
import { useDebouncedCallback } from "use-debounce"
import useDeepCompareEffect from "use-deep-compare-effect"

const { API_BASE } = import.meta.env

type Json = Record<string, unknown>

const commonOpts: RequestInit = {
    credentials: "include",
    cache: "reload",
}

// Read the Django CSRF token, from https://docs.djangoproject.com/en/3.2/ref/csrf/#ajax
export const csrftoken = (function (name) {
    let cookieValue = null
    if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split(";")
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim()
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (`${name  }=`)) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
                break
            }
        }
    }
    return cookieValue
})("csrftoken")

export class ResponseError extends Error {
    status: number
    responseJSON: Json

    constructor(response: Response, responseJSON) {
        super(`Server responded with HTTP status code ${response.status}`)

        this.status = response.status
        this.responseJSON = responseJSON

        if (responseJSON.error) {
            this.message = responseJSON.error
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
            "X-CSRFToken": csrftoken,
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
            "X-CSRFToken": csrftoken,
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
    owner: AnonymousUser | User,
    parent: string | null, // URL
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

export function useScratch(slugOrUrl: string): {
    scratch: Readonly<Scratch> | null,
    savedScratch: Readonly<Scratch> | null,
    setScratch: (scratch: Partial<Scratch>) => void, // Update the scratch, but only locally
    saveScratch: () => Promise<void>, // Persist the scratch to the server
    version: number, // Increases when different data is loaded from the server
    isLoading: boolean,
    isSaved: boolean,
    error: ResponseError | null,
} {
    if (!isAbsoluteUrl(slugOrUrl)) {
        slugOrUrl = `/scratch/${slugOrUrl}`
    }

    const [isSaved, setIsSaved] = useState(true)
    const [version, setVersion] = useState(0)
    const [localScratch, setLocalScratch] = useState<Scratch | null>(null)
    const { data, error, mutate } = useSWR<{ scratch: Scratch }, ResponseError>(slugOrUrl, get, {
        refreshInterval: isSaved ? 5000 : 0,
        onSuccess: ({ scratch }) => {
            // Only update localScratch if there aren't unsaved changes (otherwise, data loss could occur)
            if (!localScratch || (isSaved && !dequal(scratch, localScratch))) {
                console.info("Got updated scratch from server", scratch)
                setLocalScratch(scratch)
                setVersion(version + 1)
            }
        },
        onErrorRetry,
    })
    const savedScratch = data?.scratch || null

    // If the slug changes, forget the local scratch
    useEffect(() => {
        setLocalScratch(null)
        mutate()
        setIsSaved(true)
    }, [slugOrUrl, mutate])

    const setScratch = useCallback((partial: Partial<Scratch>) => {
        const scratch = Object.assign({}, localScratch, partial)

        if (dequal(scratch, savedScratch)) {
            setLocalScratch(savedScratch)
        } else {
            setLocalScratch(scratch)
            setIsSaved(false)
        }
    }, [localScratch, savedScratch])

    const saveScratch = useCallback(() => {
        if (!localScratch) {
            throw new Error("Cannot save scratch before it is loaded")
        }
        if (!localScratch.owner.is_you) {
            throw new Error("Cannot save scratch which you do not own")
        }

        return patch(`/scratch/${savedScratch.slug}`, {
            // TODO: api should take { scratch } and support undefinedIfUnchanged on all fields
            source_code: localScratch.source_code,
            context: localScratch.context, //undefinedIfUnchanged("context"),
            compiler: localScratch.compiler,
            cc_opts: localScratch.cc_opts,
        }).then(() => {
            setIsSaved(true)
            mutate({ scratch: localScratch }, true)
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
    const { scratch } = await post(`/scratch/${parent.slug}/fork`, parent)
    return scratch
}

export function useForkScratchAndGo(parent: Scratch): () => Promise<void> {
    const history = useHistory()

    return async () => {
        const fork = await forkScratch(parent)
        history.push(`/scratch/${fork.slug}`)
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
        }).then(({ compilation }: { compilation: Compilation }) => {
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
