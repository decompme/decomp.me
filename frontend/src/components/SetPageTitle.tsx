"use client"

// Next.js currently doesn't support head.js files accessing search params:
//  https://github.com/vercel/next.js/pull/43305
// So we'll update it on the client instead, with this component.
// In future - once this is supported - we can use dynamic <AppHead> instead.

import { usePageTitle } from "@/lib/hooks"

export default function SetPageTitle({ title }: { title: string }) {
    usePageTitle(title)
    return <></>
}
