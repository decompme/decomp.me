"use client"

import { useEffect, useRef, useState } from "react"

import { useRouter } from "next/navigation"

import LoadingSkeleton from "@/app/scratch/[slug]/loading"
import { post } from "@/lib/api/request"

export default function Page({ params, searchParams }: {
    params: { slug: string }
    searchParams: { token: string }
}) {
    const router = useRouter()

    // The POST request must happen on the client so
    // that the Django session cookie is present.
    const effectRan = useRef(false)
    const [error, setError] = useState(null)
    useEffect(() => {
        if (!effectRan.current) {
            post(`/scratch/${params.slug}/claim`, { token: searchParams.token })
                .then(data => {
                    if (data.success) {
                        router.replace(`/scratch/${params.slug}`)
                    } else {
                        throw new Error("Unable to claim scratch")
                    }
                })
                .catch(err => {
                    console.error("Failed to claim scratch", err)
                    setError(err)
                })
        }

        return () => {
            effectRan.current = true
        }
    }, [params.slug, router, searchParams.token])

    if (error) {
        // Rely on error boundary to catch and display error
        throw error
    }
    return <LoadingSkeleton/>
}
