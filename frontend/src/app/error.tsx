"use client"

import { useEffect } from "react"

import { SyncIcon } from "@primer/octicons-react"

import Button from "@/components/Button"
import ErrorBoundary from "@/components/ErrorBoundary"
import SetPageTitle from "@/components/SetPageTitle"

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

    return <>
        <SetPageTitle title="Error" />
        <div className="grow" />
        <main className="max-w-prose p-4 md:mx-auto">
            <h1 className="text-3xl font-semibold">Something went wrong</h1>
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
