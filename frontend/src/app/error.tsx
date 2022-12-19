"use client"

import { useEffect } from "react"
import Button from "../components/Button"

import ErrorBoundary from "../components/ErrorBoundary"
import Footer from "../components/Footer"
import Nav from "../components/Nav"

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

    return (
        <>
            <ErrorBoundary>
                <Nav />
            </ErrorBoundary>

            <main className="md:container md:mx-auto p-4">
                <h1 className="text-3xl font-semibold">Something went wrong</h1>
                <p className="py-4">
                    An unexpected error occurred.
                </p>
                <div className="bg-gray-800 text-white p-4 rounded">
                    <code className="text-sm font-mono">{error.toString()}</code>
                </div>
                <p className="py-4">
                    If this keeps happening, <a href="https://discord.gg/sutqNShRRs" className="underline hover:text-blue-500">let us know</a>.
                </p>
                <ErrorBoundary>
                    <Button
                        onClick={reset}
                    >
                        Try again
                    </Button>
                </ErrorBoundary>
            </main>

            <ErrorBoundary>
                <Footer />
            </ErrorBoundary>
        </>
    )
}
