"use client"

import { useEffect } from "react"

import { SyncIcon } from "@primer/octicons-react"

import Button from "../components/Button"
import ErrorBoundary from "../components/ErrorBoundary"

export default function Error({
    error,
    reset,
}: {
    error: Error
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return <main className="max-w-prose p-4 md:mx-auto">
        <h1 className="text-3xl font-semibold">Something went wrong</h1>
        <p className="py-4">
            An unexpected error occurred rendering this page.
        </p>
        <div className="rounded bg-gray-9 p-4 text-gray-2">
            <code className="font-mono text-sm">{error.toString()}</code>
        </div>
        <p className="py-4">
            If this keeps happening, <a href="https://discord.gg/sutqNShRRs" className="text-blue-5 hover:underline active:translate-y-px">let us know</a>.
        </p>
        <ErrorBoundary>
            <Button onClick={reset}>
                <SyncIcon /> Try again
            </Button>
        </ErrorBoundary>
    </main>
}
