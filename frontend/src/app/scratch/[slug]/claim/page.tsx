"use client"

import { useEffect, useRef } from "react"

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
    useEffect(() => {
        if (!effectRan.current) {
            post(`/scratch/${params.slug}/claim`, { token: searchParams.token })
                .catch(err => console.error(err))
                .finally(() => router.push(`/scratch/${params.slug}`))
        }

        return () => {
            effectRan.current = true
        }
    }, [params.slug, router, searchParams.token])

    return <LoadingSkeleton/>
}
