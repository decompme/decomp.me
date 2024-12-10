"use client"

import { useEffect } from "react"

import { SyncIcon } from "@primer/octicons-react"

import Button from "@/components/Button"
import ErrorBoundary from "@/components/ErrorBoundary"
import SetPageTitle from "@/components/SetPageTitle"
import { RequestFailedError } from "@/lib/api"

type ErrorPageProps = {error: Error, reset: () => void };

function NetworkErrorPage({ error }: ErrorPageProps) {
    return <>
        <SetPageTitle title="Error" />
        <div className="grow" />
        <main className="max-w-prose p-4 md:mx-auto">
            <h1 className="py-4 font-semibold text-3xl">We're having some trouble reaching the backend</h1>

            <div className="rounded bg-gray-2 p-4 text-gray-11">
                <code className="font-mono text-sm">{error.toString()}</code>
            </div>

            <p className="py-4">
                If your internet connection is okay, we're probably down for maintenance, and will be back shortly. If this issue persists - <a href="https://discord.gg/sutqNShRRs" className="text-blue-11 hover:underline active:translate-y-px">let us know</a>.
            </p>

            <ErrorBoundary>
                <Button onClick={() => window.location.reload()}>
                    <SyncIcon /> Try again
                </Button>
            </ErrorBoundary>
        </main>
        <div className="grow" />
    </>
}

function UnexpectedErrorPage({ error, reset }: ErrorPageProps) {
    return <>
        <SetPageTitle title="Error" />
        <div className="grow" />
        <main className="max-w-prose p-4 md:mx-auto">
            <h1 className="font-semibold text-3xl">Something went wrong</h1>
            <p className="py-4">
                An unexpected error occurred rendering this page.
            </p>
            <div className="rounded bg-gray-2 p-4 text-gray-11">
                <code className="font-mono text-sm">{error.toString()}</code>
            </div>
            <p className="py-4">
                If this keeps happening, <a href="https://discord.gg/sutqNShRRs" className="text-blue-11 hover:underline active:translate-y-px">let us know</a>.
            </p>
            <ErrorBoundary>
                <Button onClick={reset}>
                    <SyncIcon /> Try again
                </Button>
            </ErrorBoundary>
        </main>
        <div className="grow" />
    </>
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return error instanceof RequestFailedError ? <NetworkErrorPage error={error} reset={reset} /> : <UnexpectedErrorPage error={error} reset={reset} />
}

export const metadata = {
    title: "Error",
}
