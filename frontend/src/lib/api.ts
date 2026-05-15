import { useState, useCallback, useEffect, useRef } from "react";

import { useRouter } from "@/lib/navigation";

import useSWR, { type Revalidator, type RevalidatorOptions, mutate } from "swr";
import useSWRImmutable from "swr/immutable";
import { useDebouncedCallback } from "use-debounce";

import { ResponseError, get, getPublic, post, patch } from "./api/request";
import type {
    AnonymousUser,
    User,
    Scratch,
    TerseScratch,
    Compilation,
    Page,
    Compiler,
    LibraryVersions,
    Platform,
    Preset,
    PresetBase,
    ClaimableScratch,
} from "./api/types";
import { scratchUrl } from "./api/urls";
import {
    buildScratchCompileRequest,
    buildScratchSavePatch,
    isScratchSaved,
} from "./api/scratchState";
import { ignoreNextWarnBeforeUnload } from "./hooks";

function onErrorRetry<C>(
    error: ResponseError,
    key: string,
    config: C,
    revalidate: Revalidator,
    { retryCount }: RevalidatorOptions,
) {
    if (error.status === 404) return;
    if (retryCount >= 10) return;

    // Retry after 5 seconds
    setTimeout(() => revalidate({ retryCount }), 5000);
}

export * from "./api/request";
export * from "./api/scratchState";
export * from "./api/types";

export function useThisUser(): User | AnonymousUser | undefined {
    const { data: user, error } = useSWRImmutable<AnonymousUser | User>(
        "/user",
        get,
    );

    if (error) {
        throw error;
    }

    return user;
}

export function useThisUserIsAdmin(): boolean {
    const user = useThisUser();

    return user?.is_admin;
}

export function isUserEq(
    a: User | AnonymousUser | undefined,
    b: User | AnonymousUser | undefined,
): boolean {
    return a && b && a.id === b.id && a.is_anonymous === b.is_anonymous;
}

export function useUserIsYou(): (
    user: User | AnonymousUser | undefined,
) => boolean {
    const you = useThisUser();

    return useCallback(
        (user) => {
            return isUserEq(you, user);
        },
        [you?.id, you?.is_anonymous],
    ); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useSavedScratch(scratch: Scratch, enabled = true): Scratch {
    const { data: savedScratch, error } = useSWR(
        enabled ? scratchUrl(scratch) : null,
        get,
        {
            fallbackData: scratch, // No loading state, just use the local scratch
        },
    );

    if (error) throw error;

    return savedScratch;
}

export function useSaveScratch(localScratch: Scratch): () => Promise<Scratch> {
    const savedScratch = useSavedScratch(localScratch);
    const userIsYou = useUserIsYou();

    const saveScratch = useCallback(async () => {
        if (!localScratch) {
            throw new Error("Cannot save scratch before it is loaded");
        }
        if (!userIsYou(localScratch.owner)) {
            throw new Error("Cannot save scratch which you do not own");
        }

        const updatedScratch = await patch(
            scratchUrl(localScratch),
            buildScratchSavePatch(savedScratch, localScratch),
        );

        await mutate(scratchUrl(localScratch), updatedScratch, {
            revalidate: false,
        });

        return updatedScratch;
    }, [localScratch, savedScratch, userIsYou]);

    return saveScratch;
}

export async function claimScratch(scratch: ClaimableScratch): Promise<void> {
    const { success } = await post(`${scratchUrl(scratch)}/claim`, {
        token: scratch.claim_token,
    });
    const user = await get("/user");

    if (!success) throw new Error("Scratch cannot be claimed");

    await mutate("/user", user, { revalidate: false });

    delete scratch.claim_token;
    await mutate(scratchUrl(scratch), {
        ...scratch,
        owner: user,
    });
}

export async function forkScratch(parent: TerseScratch): Promise<Scratch> {
    const scratch = await post(`${scratchUrl(parent)}/fork`, parent);

    if (scratch.owner) {
        await mutate("/user", scratch.owner, { revalidate: false });
    }
    await mutate(scratchUrl(scratch), scratch, { revalidate: false });

    return scratch;
}

export function useForkScratchAndGo(parent: TerseScratch): () => Promise<void> {
    const router = useRouter();

    return useCallback(async () => {
        const fork = await forkScratch(parent);

        ignoreNextWarnBeforeUnload();
        await router.push(scratchUrl(fork));
    }, [parent, router]);
}

export function useIsScratchSaved(scratch: Scratch, enabled = true): boolean {
    const saved = useSavedScratch(scratch, enabled);

    return isScratchSaved(scratch, saved);
}

export function useCompilation(
    scratch: Scratch | null,
    autoRecompile: boolean,
    autoRecompileDelay: number,
    initial: Compilation | null = null,
): {
    compilation: Readonly<Compilation> | null;
    compile: () => Promise<void>; // no debounce
    debouncedCompile: () => Promise<void>; // with debounce
    isCompiling: boolean;
    isCompilationOld: boolean;
} {
    const savedScratch = useSavedScratch(scratch);
    const [compileRequestPromise, setCompileRequestPromise] =
        useState<Promise<void>>(null);
    const [compilation, setCompilation] = useState<Compilation>(initial);
    const [isCompilationOld, setIsCompilationOld] = useState(false);
    const sUrl = scratchUrl(scratch);
    const hasInitialized = useRef(false);

    const compile = useCallback(() => {
        if (compileRequestPromise) return compileRequestPromise;

        if (!scratch)
            return Promise.reject(
                new Error("Cannot compile without a scratch"),
            );

        if (!scratch.compiler)
            return Promise.reject(
                new Error("Cannot compile before a compiler is set"),
            );

        const promise = post(
            `${scratchUrl(scratch)}/compile`,
            buildScratchCompileRequest(savedScratch, scratch),
        )
            .then((compilation: Compilation) => {
                return compilation;
            })
            .then((compilation: Compilation) => {
                setCompilation(compilation);
            })
            .finally(() => {
                setCompileRequestPromise(null);
                setIsCompilationOld(false);
            })
            .catch((error) => {
                if (error instanceof ResponseError) {
                    setCompilation({
                        compiler_output: error.json?.detail,
                        diff_output: null,
                        success: false,
                        left_object: null,
                        right_object: null,
                    });
                } else {
                    return Promise.reject(error);
                }
            });

        setCompileRequestPromise(promise);

        return promise;
    }, [compileRequestPromise, savedScratch, scratch]);

    // If the scratch we're looking at changes, we need to recompile
    const [url, setUrl] = useState(sUrl);
    useEffect(() => {
        if (url !== sUrl) {
            setUrl(sUrl);
            compile();
        }
    }, [compile, sUrl, url]);

    const debouncedCompile = useDebouncedCallback(compile, autoRecompileDelay, {
        leading: false,
        trailing: true,
    });

    useEffect(() => {
        if (!hasInitialized.current) {
            hasInitialized.current = true;
            if (!compilation) {
                compile();
            }
        } else {
            setIsCompilationOld(true);

            if (autoRecompile) {
                if (scratch && scratch.compiler !== "") {
                    debouncedCompile();
                } else {
                    setCompilation(null);
                }
            }
        }
    }, [
        // eslint-disable-line react-hooks/exhaustive-deps
        debouncedCompile,
        autoRecompile,

        // fields passed to compilations
        scratch.compiler,
        scratch.compiler_flags,
        scratch.diff_flags,
        scratch.diff_label,
        scratch.source_code,
        scratch.context,
        scratch.libraries,
    ]);

    return {
        compilation,
        compile,
        debouncedCompile,
        isCompiling: !!compileRequestPromise,
        isCompilationOld,
    };
}

export function usePlatform(id: string | undefined): Platform | undefined {
    const url = typeof id === "string" && id ? `/platform/${id}` : null;
    const { data } = useSWRImmutable(url, get, {
        refreshInterval: 1000 * 60 * 15, // 15 minutes
        onErrorRetry,
    });
    return data;
}

export function useCompiler(
    platform: string,
    compiler: string,
): Compiler | undefined {
    const url =
        typeof platform === "string" && typeof compiler === "string"
            ? `/compiler/${platform}/${compiler}`
            : null;
    const { data } = useSWRImmutable(url, get, {
        refreshInterval: 1000 * 60 * 15, // 15 minutes
        onErrorRetry,
    });

    return data?.[compiler];
}

export function useCompilers(platform: string): Record<string, Compiler> {
    const url = typeof platform === "string" ? `/compiler/${platform}` : null;
    const { data } = useSWRImmutable(url, get, {
        refreshInterval: 1000 * 60 * 15, // 15 minutes
        onErrorRetry,
    });

    return data || {};
}

export function useLibraries(platform: string): LibraryVersions[] {
    const getByPlatform = ([url, platform]: [string | null, string]) => {
        return get(url && platform && `${url}?platform=${platform}`);
    };

    const url = typeof platform === "string" ? "/library" : null;
    const { data } = useSWRImmutable([url, platform], getByPlatform, {
        refreshInterval: 1000 * 60 * 15, // 15 minutes
        onErrorRetry,
    });

    return data?.libraries || [];
}

export function usePresets(platform: string): Preset[] {
    const getByPlatform = ([url, platform]: [string | null, string]) => {
        return get(
            url &&
                platform &&
                `${url}?platform=${platform}&ordering=name&page_size=100`,
        );
    };

    const url = typeof platform === "string" ? "/preset" : null;
    const { data } = useSWRImmutable([url, platform], getByPlatform, {
        refreshInterval: 1000 * 60 * 5, // 5 minutes
        onErrorRetry,
    });

    return data?.results;
}

export function usePreset(id: number | undefined): PresetBase | undefined {
    const url = typeof id === "number" ? `/preset/${id}/name` : null;
    const { data } = useSWRImmutable(url, get, {
        refreshInterval: 1000 * 60 * 5, // 5 minutes
        onErrorRetry,
    });
    return data;
}

export function usePaginated<T>(
    url: string,
    options: {
        firstPage?: Page<T>;
        isPublic?: boolean;
    } = {},
): {
    results: T[];
    hasNext: boolean;
    hasPrevious: boolean;
    isLoading: boolean;
    loadNext: () => Promise<void>;
    loadPrevious: () => Promise<void>;
} {
    const { firstPage, isPublic } = options;
    const fetchPage = isPublic ? getPublic : get;
    const [results, setResults] = useState<T[]>(firstPage?.results ?? []);
    const [next, setNext] = useState<string | null>(firstPage?.next);
    const [previous, setPrevious] = useState<string | null>(
        firstPage?.previous,
    );
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let isCurrent = true;

        if (!firstPage) {
            setResults([]);
            setNext(url);
            setPrevious(null);
            setIsLoading(true);

            fetchPage(url).then((page: Page<T>) => {
                if (!isCurrent) return;

                setResults(page.results);
                setNext(page.next);
                setPrevious(page.previous);
                setIsLoading(false);
            });
        }

        return () => {
            isCurrent = false;
        };
    }, [fetchPage, url]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadNext = useCallback(async () => {
        if (!next) throw new Error("No more");

        setIsLoading(true);

        const data = await fetchPage(next);
        setResults((results) => [...results, ...data.results]);
        setNext(data.next);
        setIsLoading(false);
    }, [fetchPage, next]);

    const loadPrevious = useCallback(async () => {
        if (!previous) throw new Error("No more");

        setIsLoading(true);

        const data = await fetchPage(previous);
        setResults((results) => [...data.results, ...results]);
        setPrevious(data.previous);
        setIsLoading(false);
    }, [fetchPage, previous]);

    return {
        results,
        hasNext: !!next,
        hasPrevious: !!previous,
        isLoading,
        loadNext,
        loadPrevious,
    };
}

export interface Stats {
    asm_count: number;
    scratch_count: number;
    github_user_count: number;
}

export function useStats(): Stats | undefined {
    const { data, error } = useSWR<Stats>("/stats", getPublic, {
        refreshInterval: 1000 * 60, // 60 seconds
    });

    if (error) {
        throw error;
    }

    return data;
}
