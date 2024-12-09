"use client";

import { useState, useEffect, Suspense } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { useSWRConfig } from "swr";

import GitHubLoginButton from "@/components/GitHubLoginButton";
import LoadingSpinner from "@/components/loading.svg";
import * as api from "@/lib/api";
import { requestMissingScopes } from "@/lib/oauth";

function Login() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState(null);
    const { mutate } = useSWRConfig();
    const code = searchParams.get("code");
    const next = searchParams.get("next");
    const githubError = searchParams.get("error");

    useEffect(() => {
        if (code && !error) {
            requestMissingScopes(() => api.post("/user", { code }))
                .then((user: api.User) => {
                    if (user.is_anonymous) {
                        return Promise.reject(
                            new Error("Still not logged-in."),
                        );
                    }

                    mutate("/user", user);

                    if (next) {
                        router.replace(next);
                    } else if (window.opener) {
                        window.postMessage(
                            {
                                source: "decomp_me_login",
                                user,
                            },
                            window.opener,
                        );
                        window.close();
                    } else {
                        window.location.href = "/";
                    }
                })
                .catch((error) => {
                    console.error(error);
                    setError(error);
                });
        }

        if (githubError === "access_denied") {
            setError(
                new Error(
                    "Please grant access to your GitHub account to sign in!",
                ),
            );
        }
    }, [code, router, mutate, next, error, githubError]);

    return (
        <main className="mx-auto flex max-w-prose items-center justify-center px-4 py-6 text-base leading-normal">
            {error ? (
                <div>
                    <h1 className="font-semibold text-3xl">Error signing in</h1>
                    <p className="py-4">
                        The following error prevented you from signing in:
                    </p>
                    <div className="rounded bg-gray-9 p-4 text-gray-2">
                        <code className="font-mono text-sm">
                            {error.toString()}
                        </code>
                    </div>
                    <p className="py-4">
                        You can try again by clicking the button below.
                    </p>
                    <GitHubLoginButton />
                </div>
            ) : code ? (
                <div className="flex items-center justify-center gap-4 py-8 font-medium text-2xl text-gray-12">
                    <LoadingSpinner width={32} className="animate-spin" />
                    Signing in...
                </div>
            ) : (
                <div>
                    <p>Sign in to decomp.me</p>
                    <GitHubLoginButton />
                </div>
            )}
        </main>
    );
}

// Handles GitHub OAuth callback
export default function Page() {
    return (
        <Suspense>
            <Login />
        </Suspense>
    );
}
