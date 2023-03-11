import { useState, useCallback, useEffect } from "react"

import { useRouter } from "next/navigation"

import useSWR, { Revalidator, RevalidatorOptions, mutate } from "swr"
import { useDebouncedCallback } from "use-debounce"

import { ResponseError, get, post, patch, delete_ } from "./api/request"
import { AnonymousUser, User, Scratch, TerseScratch, Compilation, Page, Compiler, Platform, Project, ProjectMember } from "./api/types"
import { ignoreNextWarnBeforeUnload } from "./hooks"

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

export * from "./api/request"
export * from "./api/types"

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

        return updatedScratch
    }, [localScratch, savedScratch, userIsYou])

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

    return useCallback(async () => {
        const fork = await forkScratch(parent)

        ignoreNextWarnBeforeUnload()
        await router.push(fork.html_url)
    }, [parent, router])
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
            if (error instanceof ResponseError) {
                setCompilation({ "compiler_output": error.json?.detail, "diff_output": null, "success": false })
            } else {
                return Promise.reject(error)
            }
        })

        setCompileRequestPromise(promise)

        return promise
    }, [compileRequestPromise, savedScratch, scratch])

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
    const { data } = useSWR<{ "platforms": Record<string, Platform> }>("/compilers", get, {
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

export function useProjectMembers(project: Project): {
    members: ProjectMember[]
    addMember: (username: string) => Promise<void>
    removeMember: (username: string) => Promise<void>
} {
    const url = `${project.url}/members`
    const { data, error, mutate } = useSWR<ProjectMember[]>(url, get)

    if (error) {
        throw error
    }

    return {
        members: data || [],
        async addMember(username: string) {
            await mutate(() => post(url, { username }))
        },
        async removeMember(username: string) {
            await delete_(`${url}/${username}`, {})
            await mutate()
        },
    }
}

export function useIsUserProjectMember(project: Project): boolean {
    const user = useThisUser()
    const { members } = useProjectMembers(project)

    return !!members.find(member => member.username === user?.username)
}
