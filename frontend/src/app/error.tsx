"use client"

import { useEffect } from "react"

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

            <main>
                <h1 className="text-3xl font-bold underline">Something went wrong</h1>
                <p>
                An unexpected error occurred.
                For more information, check the JavaScript console.
                </p>
                <p style={{ color: "var(--g600)" }}>
                If this keeps happening, <a href="https://discord.gg/sutqNShRRs">let us know</a>.
                </p>
            </main>

            <ErrorBoundary>
                <Footer />
            </ErrorBoundary>
        </>
    )
}
